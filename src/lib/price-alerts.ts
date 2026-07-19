import "server-only";
import type { PriceAlert } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getExchange } from "@/lib/exchange";
import { notify } from "@/lib/notifications";
import type { PriceAlertView } from "@/lib/price-alert-types";

export class PriceAlertError extends Error {}

const MAX_ACTIVE = 20;

async function priceMap(): Promise<Map<string, number>> {
  const assets = await getExchange().listSwapAssets();
  const m = new Map<string, number>(assets.map((a) => [a.symbol, a.usdtPrice]));
  m.set("USDT", 1);
  return m;
}

function toView(a: PriceAlert): PriceAlertView {
  return {
    id: a.id,
    symbol: a.symbol,
    direction: a.direction as "ABOVE" | "BELOW",
    target: Number(a.target),
    triggered: a.triggered,
    createdAt: a.createdAt.getTime(),
    triggeredAt: a.triggeredAt ? a.triggeredAt.getTime() : null,
  };
}

export async function createAlert(
  userId: string,
  symbolRaw: string,
  target: number,
): Promise<PriceAlertView> {
  const symbol = symbolRaw.trim().toUpperCase();
  if (!symbol || symbol === "USDT") throw new PriceAlertError("Choose a crypto asset.");
  if (!(target > 0)) throw new PriceAlertError("Enter a target price greater than zero.");

  const current = (await priceMap()).get(symbol);
  if (current == null) throw new PriceAlertError(`We don't track a price for ${symbol}.`);

  const active = await prisma.priceAlert.count({ where: { userId, triggered: false } });
  if (active >= MAX_ACTIVE) {
    throw new PriceAlertError(`You can have at most ${MAX_ACTIVE} active alerts.`);
  }

  // Infer the direction from where the target sits relative to the live price.
  const direction = target >= current ? "ABOVE" : "BELOW";
  const a = await prisma.priceAlert.create({ data: { userId, symbol, direction, target } });
  return toView(a);
}

export async function listAlerts(
  userId: string,
): Promise<{ alerts: PriceAlertView[]; prices: Record<string, number> }> {
  const [rows, prices] = await Promise.all([
    prisma.priceAlert.findMany({
      where: { userId },
      orderBy: [{ triggered: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    priceMap(),
  ]);
  const relevant: Record<string, number> = {};
  for (const r of rows) {
    const p = prices.get(r.symbol);
    if (p != null) relevant[r.symbol] = p;
  }
  return { alerts: rows.map(toView), prices: relevant };
}

export async function deleteAlert(userId: string, id: string): Promise<void> {
  await prisma.priceAlert.deleteMany({ where: { id, userId } });
}

/** Fire any untriggered alert whose target has been crossed. Called from the cron. */
export async function processPriceAlerts(): Promise<{ checked: number; fired: number }> {
  const pending = await prisma.priceAlert.findMany({ where: { triggered: false }, take: 500 });
  if (pending.length === 0) return { checked: 0, fired: 0 };
  const prices = await priceMap();

  let fired = 0;
  for (const a of pending) {
    const price = prices.get(a.symbol);
    if (price == null) continue;
    const target = Number(a.target);
    const hit = a.direction === "ABOVE" ? price >= target : price <= target;
    if (!hit) continue;

    // Flip to triggered exactly once (guards overlapping cron passes).
    const upd = await prisma.priceAlert.updateMany({
      where: { id: a.id, triggered: false },
      data: { triggered: true, triggeredAt: new Date() },
    });
    if (upd.count === 0) continue;
    fired++;
    await notify(a.userId, {
      type: "SYSTEM",
      title: `${a.symbol} price alert`,
      body: `${a.symbol} is now ${a.direction === "ABOVE" ? "above" : "below"} $${target.toLocaleString()} — currently $${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`,
      href: `/trade/${a.symbol}-USDT`,
    });
  }
  return { checked: pending.length, fired };
}
