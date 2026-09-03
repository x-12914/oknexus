import { LedgerType, Prisma, type Order } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getExchange } from "@/lib/exchange";
import { withLedger, credit, settleLocked, InsufficientBalanceError } from "@/lib/ledger";
import { marketMeta } from "@/lib/seed";
import { getFeeProfile } from "@/lib/fees";
import { notify } from "@/lib/notifications";

/**
 * Fills resting limit orders against the live market.
 *
 * There is no internal book to cross against, so the reference is the public
 * book the market-data connector serves. A resting BUY at 100 fills once asks
 * at or below 100 exist, and only for as much size as those asks carry; the
 * rest keeps resting. That is what makes a partial fill honest here: the
 * quantity comes from real depth, not from a coin flip.
 *
 * Fills settle at the order's own limit price, out of the funds locked when it
 * was placed, at the maker rate. Depth is consumed as the pass walks orders in
 * time order, so two users cannot both be filled from the same ask.
 *
 * Runs from the cron pass. Safe under overlapping passes: each fill re-reads
 * the order inside its transaction and guards the update on the filled
 * quantity it started from, so a second pass either sees the new state or
 * rolls back.
 */
type Tx = Prisma.TransactionClient;
type MarketMeta = NonNullable<ReturnType<typeof marketMeta>>;

const MAX_ORDERS_PER_PASS = 500;
const BOOK_DEPTH = 100;
/** Ledger amounts are Decimal(30,10); round the same way before comparing. */
const dec = (x: number) => Math.round(x * 1e10) / 1e10;

export interface MatchResult {
  checked: number;
  fills: number;
  filled: number;
  partial: number;
}

interface Level {
  price: number;
  qty: number;
}

export async function matchRestingOrders(): Promise<MatchResult> {
  const resting = await prisma.order.findMany({
    where: { status: { in: ["OPEN", "PARTIAL"] }, type: { in: ["LIMIT", "STOP_LIMIT"] } },
    include: { market: true },
    orderBy: { createdAt: "asc" },
    take: MAX_ORDERS_PER_PASS,
  });
  const result: MatchResult = { checked: resting.length, fills: 0, filled: 0, partial: 0 };
  if (resting.length === 0) return result;

  const bySymbol = new Map<string, typeof resting>();
  for (const o of resting) {
    const list = bySymbol.get(o.market.symbol) ?? [];
    list.push(o);
    bySymbol.set(o.market.symbol, list);
  }

  for (const [symbol, orders] of bySymbol) {
    const meta = marketMeta(symbol);
    if (!meta) continue;

    let asks: Level[];
    let bids: Level[];
    try {
      const book = await getExchange().getOrderBook(symbol, BOOK_DEPTH);
      asks = book.asks.map((l) => ({ price: l.price, qty: l.quantity }));
      bids = book.bids.map((l) => ({ price: l.price, qty: l.quantity }));
    } catch {
      continue; // no book this pass; the orders keep resting
    }
    // A crossed or one-sided book is a synthetic or broken feed, not a market.
    // Filling anyone against it would be inventing trades.
    if (asks.length === 0 || bids.length === 0 || bids[0].price >= asks[0].price) continue;

    for (const o of orders) {
      const limit = Number(o.price);
      const remaining = Number(o.quantity) - Number(o.filledQty);
      if (!(limit > 0) || !(remaining > 0)) continue;

      const levels = o.side === "BUY" ? asks : bids;
      const eligible = (p: number) => (o.side === "BUY" ? p <= limit : p >= limit);
      let available = 0;
      for (const l of levels) if (eligible(l.price)) available += l.qty;
      if (!(available > 0)) continue;

      const qty = fillQuantity(remaining, available, meta.stepSize);
      if (!(qty > 0)) continue;

      const outcome = await fillResting(o, meta, qty, limit);
      if (!outcome) continue;

      // Consume the depth this fill used so the next order sees what is left.
      let left = outcome.qty;
      for (const l of levels) {
        if (left <= 0) break;
        if (!eligible(l.price)) continue;
        const take = Math.min(l.qty, left);
        l.qty -= take;
        left -= take;
      }
      result.fills++;
      if (outcome.done) result.filled++;
      else result.partial++;
    }
  }
  return result;
}

/**
 * How much of `remaining` to fill given `available` depth, on the market's
 * step size. Rounds down so a fill never exceeds the depth, but if what would
 * be left over is smaller than one step it takes the whole remainder instead,
 * because a crumb below step size could never fill on its own.
 */
function fillQuantity(remaining: number, available: number, step: number): number {
  if (available >= remaining) return remaining;
  const steps = Math.floor(available / step + 1e-9);
  const qty = Number((steps * step).toFixed(10));
  if (!(qty > 0)) return 0;
  return remaining - qty < step ? remaining : qty;
}

/**
 * Settle one fill of a resting order from its locked funds, at the maker rate.
 * Returns null when nothing happened: the order was cancelled or filled by a
 * concurrent pass, or its locked funds were not where the ledger expected.
 */
async function fillResting(
  o: Order,
  meta: MarketMeta,
  qty: number,
  price: number,
): Promise<{ qty: number; done: boolean } | null> {
  const { makerPct } = await getFeeProfile(o.userId);
  const { base, quote } = meta;
  let outcome: { qty: number; done: boolean; avg: number } | null;
  try {
    outcome = await withLedger(async (tx: Tx) => {
      const cur = await tx.order.findFirst({
        where: { id: o.id, status: { in: ["OPEN", "PARTIAL"] } },
      });
      if (!cur) return null;
      const prevFilled = Number(cur.filledQty);
      const total = Number(cur.quantity);
      const q = Math.min(qty, total - prevFilled);
      if (!(q > 0)) return null;

      const notional = dec(q * price);
      const ref = { type: LedgerType.SPOT, refId: o.id, memo: `Spot ${o.side} ${base} (maker)` };
      if (o.side === "BUY") {
        const fee = dec(q * makerPct);
        await settleLocked(tx, o.userId, quote, notional, ref);
        await credit(tx, o.userId, base, dec(q - fee), ref);
        await tx.trade.create({
          data: { marketId: o.marketId, orderId: o.id, userId: o.userId, side: o.side, price, quantity: q, fee, feeSymbol: base },
        });
      } else {
        const fee = dec(notional * makerPct);
        await settleLocked(tx, o.userId, base, q, ref);
        await credit(tx, o.userId, quote, dec(notional - fee), ref);
        await tx.trade.create({
          data: { marketId: o.marketId, orderId: o.id, userId: o.userId, side: o.side, price, quantity: q, fee, feeSymbol: quote },
        });
      }

      const newFilled = dec(prevFilled + q);
      const done = newFilled >= total - 1e-9;
      const prevAvg = cur.avgFillPrice != null ? Number(cur.avgFillPrice) : price;
      const avg = prevFilled > 0 ? (prevAvg * prevFilled + price * q) / newFilled : price;
      // Guarded on the filled quantity we read: a concurrent fill makes this a
      // no-op and the throw rolls back the ledger moves above.
      const upd = await tx.order.updateMany({
        where: { id: o.id, filledQty: cur.filledQty },
        data: { filledQty: newFilled, avgFillPrice: avg, status: done ? "FILLED" : "PARTIAL" },
      });
      if (upd.count === 0) throw new Error("concurrent fill");
      return { qty: q, done, avg };
    });
  } catch (e) {
    if (e instanceof InsufficientBalanceError) {
      // Locked funds are not there. That is a ledger inconsistency, not a
      // market condition, so say so where it will be seen and leave the order.
      console.error(`[matcher] order ${o.id}: locked ${e.message} missing at fill time`);
    }
    return null;
  }
  if (!outcome) return null;

  const pairHref = `/trade/${base}-${quote}`;
  const verb = o.side === "BUY" ? "Bought" : "Sold";
  await notify(o.userId, {
    type: "TRADE",
    title: outcome.done ? "Limit order filled" : "Limit order partially filled",
    body: outcome.done
      ? `${verb} ${Number(o.quantity)} ${base} at ${price}.`
      : `${verb} ${outcome.qty} ${base} at ${price}. The rest is still resting.`,
    href: pairHref,
  });
  return { qty: outcome.qty, done: outcome.done };
}
