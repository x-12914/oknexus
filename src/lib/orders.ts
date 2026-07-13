import { LedgerType, type Order } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getExchange } from "@/lib/exchange";
import { withLedger, credit, debit, lock, unlock } from "@/lib/ledger";
import { ensureMarkets, marketMeta } from "@/lib/seed";
import type { OrderResult, PlaceOrderInput } from "@/lib/exchange/types";

// DB-backed spot order service. The connector is used only for live pricing
// (getTicker); order state and settlement live in Postgres + the ledger.
//
// Fill model (no standalone matching engine yet):
//   • MARKET            → fills immediately at best ask/bid.
//   • marketable LIMIT  → fills immediately at the limit price.
//   • resting LIMIT     → rests OPEN with funds LOCKED; cancel returns them.
// Taker fee is charged from the received asset. Filling resting limits when the
// market later crosses them is a follow-up (a background matcher).

function toResult(o: Order, symbol: string): OrderResult {
  return {
    id: o.id,
    symbol,
    side: o.side,
    type: o.type,
    price: o.price != null ? Number(o.price) : undefined,
    quantity: Number(o.quantity),
    filledQty: Number(o.filledQty),
    avgFillPrice: o.avgFillPrice != null ? Number(o.avgFillPrice) : undefined,
    status: o.status,
    createdAt: o.createdAt.getTime(),
  };
}

export async function placeOrder(input: PlaceOrderInput): Promise<OrderResult> {
  const meta = marketMeta(input.symbol);
  if (!meta) throw new Error(`Unknown market: ${input.symbol}`);
  if (input.type === "LIMIT" && input.price == null) {
    throw new Error("Limit orders require a price");
  }

  await ensureMarkets();
  const market = await prisma.market.findUnique({ where: { symbol: input.symbol } });
  if (!market) throw new Error(`Unknown market: ${input.symbol}`);

  const ticker = await getExchange().getTicker(input.symbol);
  const { userId, side, type, quantity } = input;
  const { base, quote, takerFee } = meta;

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
      const notional = quantity * fillPrice;
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
      const ref = { type: LedgerType.SPOT, refId: order.id, memo: `Spot ${side} ${base}` };
      if (side === "BUY") {
        const feeBase = quantity * takerFee;
        await debit(tx, userId, quote, notional, ref);
        await credit(tx, userId, base, quantity - feeBase, ref);
        await tx.trade.create({
          data: {
            marketId: market.id,
            orderId: order.id,
            userId,
            side,
            price: fillPrice,
            quantity,
            fee: feeBase,
            feeSymbol: base,
          },
        });
      } else {
        const feeQuote = notional * takerFee;
        await debit(tx, userId, base, quantity, ref);
        await credit(tx, userId, quote, notional - feeQuote, ref);
        await tx.trade.create({
          data: {
            marketId: market.id,
            orderId: order.id,
            userId,
            side,
            price: fillPrice,
            quantity,
            fee: feeQuote,
            feeSymbol: quote,
          },
        });
      }
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

export async function cancelOrder(userId: string, orderId: string): Promise<OrderResult> {
  const existing = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { market: true },
  });
  if (!existing) throw new Error("Order not found");
  const symbol = existing.market.symbol;
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
      status: { in: ["OPEN", "PARTIAL"] },
      ...(symbol ? { market: { symbol } } : {}),
    },
    include: { market: true },
    orderBy: { createdAt: "desc" },
  });
  return orders.map((o) => toResult(o, o.market.symbol));
}
