import { LedgerType, Prisma, type Order } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getExchange } from "@/lib/exchange";
import { withLedger, credit, debit, lock, unlock, InsufficientBalanceError } from "@/lib/ledger";
import { ensureMarkets, marketMeta } from "@/lib/seed";
import { notify } from "@/lib/notifications";
import type { OrderResult, PlaceOrderInput } from "@/lib/exchange/types";

// DB-backed spot order service. The connector is used only for live pricing
// (getTicker); order state and settlement live in Postgres + the ledger.
//
// Fill model (no standalone matching engine yet):
//   • MARKET            → fills immediately at best ask/bid.
//   • marketable LIMIT  → fills immediately at the limit price.
//   • resting LIMIT     → rests OPEN with funds LOCKED; cancel returns them.
//   • STOP / STOP_LIMIT → rest PENDING (no funds locked) until the trigger price
//                          is hit; a cron pass (processStopTriggers) then fires
//                          them into a market fill / limit order.
// Taker fee is charged from the received asset.

type Tx = Prisma.TransactionClient;
type MarketMeta = NonNullable<ReturnType<typeof marketMeta>>;

function toResult(o: Order, symbol: string): OrderResult {
  return {
    id: o.id,
    symbol,
    side: o.side,
    type: o.type,
    price: o.price != null ? Number(o.price) : undefined,
    triggerPrice: o.triggerPrice != null ? Number(o.triggerPrice) : undefined,
    quantity: Number(o.quantity),
    filledQty: Number(o.filledQty),
    avgFillPrice: o.avgFillPrice != null ? Number(o.avgFillPrice) : undefined,
    status: o.status,
    createdAt: o.createdAt.getTime(),
  };
}

/** Settle a full fill: move funds, charge the taker fee, and record the trade. */
async function applyFill(
  tx: Tx,
  o: { id: string; userId: string; marketId: string; side: "BUY" | "SELL" },
  meta: MarketMeta,
  quantity: number,
  fillPrice: number,
): Promise<void> {
  const { base, quote, takerFee } = meta;
  const notional = quantity * fillPrice;
  const ref = { type: LedgerType.SPOT, refId: o.id, memo: `Spot ${o.side} ${base}` };
  if (o.side === "BUY") {
    const feeBase = quantity * takerFee;
    await debit(tx, o.userId, quote, notional, ref);
    await credit(tx, o.userId, base, quantity - feeBase, ref);
    await tx.trade.create({
      data: {
        marketId: o.marketId,
        orderId: o.id,
        userId: o.userId,
        side: o.side,
        price: fillPrice,
        quantity,
        fee: feeBase,
        feeSymbol: base,
      },
    });
  } else {
    const feeQuote = notional * takerFee;
    await debit(tx, o.userId, base, quantity, ref);
    await credit(tx, o.userId, quote, notional - feeQuote, ref);
    await tx.trade.create({
      data: {
        marketId: o.marketId,
        orderId: o.id,
        userId: o.userId,
        side: o.side,
        price: fillPrice,
        quantity,
        fee: feeQuote,
        feeSymbol: quote,
      },
    });
  }
}

export async function placeOrder(input: PlaceOrderInput): Promise<OrderResult> {
  const meta = marketMeta(input.symbol);
  if (!meta) throw new Error(`Unknown market: ${input.symbol}`);
  const isStop = input.type === "STOP" || input.type === "STOP_LIMIT";
  if ((input.type === "LIMIT" || input.type === "STOP_LIMIT") && input.price == null) {
    throw new Error("Limit orders require a price");
  }
  if (isStop && !(input.triggerPrice != null && input.triggerPrice > 0)) {
    throw new Error("Stop orders require a trigger price");
  }

  await ensureMarkets();
  const market = await prisma.market.findUnique({ where: { symbol: input.symbol } });
  if (!market) throw new Error(`Unknown market: ${input.symbol}`);

  const ticker = await getExchange().getTicker(input.symbol);
  const { userId, side, type, quantity } = input;
  const { base, quote } = meta;

  // Stop / stop-limit: rest as PENDING until the trigger is hit. No funds are
  // locked until then, so they must be available when it triggers.
  if (isStop) {
    const trigger = input.triggerPrice!;
    if (side === "SELL" && !(trigger < ticker.last)) {
      throw new Error("A sell stop trigger must be below the current price.");
    }
    if (side === "BUY" && !(trigger > ticker.last)) {
      throw new Error("A buy stop trigger must be above the current price.");
    }
    const order = await prisma.order.create({
      data: {
        userId,
        marketId: market.id,
        side,
        type,
        price: type === "STOP_LIMIT" ? input.price : null,
        triggerPrice: trigger,
        quantity,
        filledQty: 0,
        status: "PENDING",
      },
    });
    return toResult(order, input.symbol);
  }

  // Decide the fill price (null → the order rests).
  let fillPrice: number | null = null;
  if (type === "MARKET") {
    fillPrice = side === "BUY" ? ticker.ask : ticker.bid;
  } else {
    const limit = input.price!;
    const marketable = side === "BUY" ? limit >= ticker.ask : limit <= ticker.bid;
    if (marketable) fillPrice = limit;
  }

  return withLedger(async (tx) => {
    if (fillPrice != null) {
      const order = await tx.order.create({
        data: {
          userId,
          marketId: market.id,
          side,
          type,
          price: type === "LIMIT" ? input.price : null,
          quantity,
          filledQty: quantity,
          avgFillPrice: fillPrice,
          status: "FILLED",
        },
      });
      await applyFill(tx, order, meta, quantity, fillPrice);
      return toResult(order, input.symbol);
    }

    // Resting limit order — lock the funds it would consume.
    const order = await tx.order.create({
      data: {
        userId,
        marketId: market.id,
        side,
        type,
        price: input.price,
        quantity,
        filledQty: 0,
        status: "OPEN",
      },
    });
    const ref = { type: LedgerType.SPOT, refId: order.id, memo: `Spot ${side} ${base} (open)` };
    if (side === "BUY") {
      await lock(tx, userId, quote, quantity * input.price!, ref);
    } else {
      await lock(tx, userId, base, quantity, ref);
    }
    return toResult(order, input.symbol);
  });
}

/**
 * Evaluate every PENDING stop order and fire any whose trigger has been hit.
 * SELL stops trigger when price falls to/below the trigger; BUY stops when it
 * rises to/above. Called from the cron pass. Idempotent under overlap.
 */
export async function processStopTriggers(): Promise<{ checked: number; triggered: number }> {
  const pending = await prisma.order.findMany({
    where: { status: "PENDING" },
    include: { market: true },
    take: 300,
  });
  if (pending.length === 0) return { checked: 0, triggered: 0 };

  const bySymbol = new Map<string, typeof pending>();
  for (const o of pending) {
    const list = bySymbol.get(o.market.symbol) ?? [];
    list.push(o);
    bySymbol.set(o.market.symbol, list);
  }

  let triggered = 0;
  for (const [symbol, orders] of bySymbol) {
    const meta = marketMeta(symbol);
    if (!meta) continue;
    let ticker;
    try {
      ticker = await getExchange().getTicker(symbol);
    } catch {
      continue; // skip this market this pass; retry next time
    }
    const last = ticker.last;
    for (const o of orders) {
      const trig = Number(o.triggerPrice);
      const hit = o.side === "SELL" ? last <= trig : last >= trig;
      if (!hit) continue;
      if (await executeTriggeredStop(o, meta, ticker)) triggered++;
    }
  }
  return { checked: pending.length, triggered };
}

async function executeTriggeredStop(
  o: Order,
  meta: MarketMeta,
  ticker: { ask: number; bid: number },
): Promise<boolean> {
  const qty = Number(o.quantity);
  const pairHref = `/trade/${meta.base}-${meta.quote}`;
  let outcome: { kind: "filled"; price: number } | { kind: "rested" } | null = null;

  try {
    outcome = await withLedger(async (tx) => {
      // Re-read under the tx so overlapping passes can't double-fire.
      const cur = await tx.order.findFirst({ where: { id: o.id, status: "PENDING" } });
      if (!cur) return null;

      if (o.type === "STOP") {
        const price = o.side === "BUY" ? ticker.ask : ticker.bid;
        await applyFill(tx, cur, meta, qty, price);
        await tx.order.update({
          where: { id: o.id },
          data: { status: "FILLED", filledQty: qty, avgFillPrice: price },
        });
        return { kind: "filled", price };
      }

      // STOP_LIMIT → becomes a limit order at o.price.
      const limit = Number(o.price);
      const marketable = o.side === "BUY" ? limit >= ticker.ask : limit <= ticker.bid;
      if (marketable) {
        await applyFill(tx, cur, meta, qty, limit);
        await tx.order.update({
          where: { id: o.id },
          data: { status: "FILLED", filledQty: qty, avgFillPrice: limit },
        });
        return { kind: "filled", price: limit };
      }
      const ref = { type: LedgerType.SPOT, refId: o.id, memo: `Stop→limit ${meta.base}` };
      if (o.side === "BUY") await lock(tx, o.userId, meta.quote, qty * limit, ref);
      else await lock(tx, o.userId, meta.base, qty, ref);
      await tx.order.update({ where: { id: o.id }, data: { status: "OPEN" } });
      return { kind: "rested" };
    });
  } catch (e) {
    if (e instanceof InsufficientBalanceError) {
      await prisma.order.updateMany({
        where: { id: o.id, status: "PENDING" },
        data: { status: "REJECTED" },
      });
      await notify(o.userId, {
        type: "TRADE",
        title: "Stop order rejected",
        body: `Your stop ${o.side.toLowerCase()} for ${qty} ${meta.base} couldn't execute — insufficient balance.`,
        href: pairHref,
      });
      return true;
    }
    return false; // transient error — leave PENDING for the next pass
  }

  if (!outcome) return false;
  if (outcome.kind === "filled") {
    await notify(o.userId, {
      type: "TRADE",
      title: "Stop order triggered",
      body: `${o.side === "BUY" ? "Bought" : "Sold"} ${qty} ${meta.base} at ${outcome.price}.`,
      href: pairHref,
    });
  } else {
    await notify(o.userId, {
      type: "TRADE",
      title: "Stop order triggered",
      body: `Your stop is now a live limit order for ${qty} ${meta.base}.`,
      href: pairHref,
    });
  }
  return true;
}

export async function cancelOrder(userId: string, orderId: string): Promise<OrderResult> {
  const existing = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { market: true },
  });
  if (!existing) throw new Error("Order not found");
  const symbol = existing.market.symbol;

  // Untriggered stop: no funds are locked, so just cancel it — guarded against a
  // concurrent trigger with a status-filtered update.
  if (existing.status === "PENDING") {
    await prisma.order.updateMany({
      where: { id: orderId, userId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    const after = await prisma.order.findFirst({ where: { id: orderId }, include: { market: true } });
    return toResult(after ?? existing, symbol);
  }

  if (existing.status !== "OPEN" && existing.status !== "PARTIAL") {
    return toResult(existing, symbol);
  }
  const meta = marketMeta(symbol);
  if (!meta) throw new Error(`Unknown market: ${symbol}`);

  return withLedger(async (tx) => {
    // Re-read inside the tx so two concurrent cancels can't both unlock.
    const o = await tx.order.findFirst({ where: { id: orderId, userId } });
    if (!o || (o.status !== "OPEN" && o.status !== "PARTIAL")) {
      throw new Error("Order not found");
    }
    const remaining = Number(o.quantity) - Number(o.filledQty);
    const ref = { type: LedgerType.SPOT, refId: o.id, memo: `Cancel ${meta.base}` };
    if (o.side === "BUY") {
      await unlock(tx, userId, meta.quote, remaining * Number(o.price), ref);
    } else {
      await unlock(tx, userId, meta.base, remaining, ref);
    }
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });
    return toResult(updated, symbol);
  });
}

export async function listOpenOrders(userId: string, symbol?: string): Promise<OrderResult[]> {
  const orders = await prisma.order.findMany({
    where: {
      userId,
      status: { in: ["OPEN", "PARTIAL", "PENDING"] },
      ...(symbol ? { market: { symbol } } : {}),
    },
    include: { market: true },
    orderBy: { createdAt: "desc" },
  });
  return orders.map((o) => toResult(o, o.market.symbol));
}
