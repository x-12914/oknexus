import "server-only";
import { LedgerAccount } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPortfolio } from "@/lib/wallet";
import { getExchange } from "@/lib/exchange";
import { marketMeta } from "@/lib/seed";
import type { Analytics, AssetSlice, TypeStat, VolumePoint } from "@/lib/analytics-types";

const dayKey = (d: Date): string => d.toISOString().slice(0, 10);

export async function getAnalytics(userId: string): Promise<Analytics> {
  const exchange = getExchange();
  const [portfolio, assets, trades, ledger] = await Promise.all([
    getPortfolio(userId),
    exchange.listSwapAssets(),
    prisma.trade.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { market: true },
      take: 5000,
    }),
    prisma.ledgerEntry.findMany({
      where: { userId, account: LedgerAccount.AVAILABLE },
      take: 10000,
    }),
  ]);

  const priceOf = new Map<string, number>(assets.map((a) => [a.symbol, a.usdtPrice]));
  priceOf.set("USDT", 1);
  const usd = (symbol: string, qty: number) => qty * (priceOf.get(symbol) ?? 0);

  // Portfolio allocation + 24h change (per-asset ticker change), USDT held flat.
  const held = portfolio.items.filter((i) => i.usdValue > 0);
  const changeMap = new Map<string, number>();
  await Promise.all(
    held.map(async (i) => {
      if (i.symbol === "USDT") {
        changeMap.set("USDT", 0);
        return;
      }
      try {
        const t = await exchange.getTicker(`${i.symbol}/USDT`);
        changeMap.set(i.symbol, t.changePct24h);
      } catch {
        changeMap.set(i.symbol, 0);
      }
    }),
  );

  let change24hUsd = 0;
  for (const i of held) {
    const pct = changeMap.get(i.symbol) ?? 0;
    const prior = i.usdValue / (1 + pct / 100);
    change24hUsd += i.usdValue - prior;
  }
  const priorTotal = portfolio.totalUsd - change24hUsd;
  const change24hPct = priorTotal > 0 ? (change24hUsd / priorTotal) * 100 : 0;

  const sliceAssets: AssetSlice[] = held
    .map((i) => ({
      symbol: i.symbol,
      name: i.name,
      usdValue: i.usdValue,
      pct: portfolio.totalUsd > 0 ? (i.usdValue / portfolio.totalUsd) * 100 : 0,
      changePct24h: changeMap.get(i.symbol) ?? 0,
    }))
    .sort((a, b) => b.usdValue - a.usdValue);

  // Trades → total volume, fees, and a daily volume series.
  let volumeUsd = 0;
  let feesUsd = 0;
  const dayVol = new Map<string, number>();
  for (const t of trades) {
    const quote = marketMeta(t.market.symbol)?.quote ?? "USDT";
    const notional = Number(t.price) * Number(t.quantity) * (priceOf.get(quote) ?? 1);
    volumeUsd += notional;
    feesUsd += Number(t.fee) * (t.feeSymbol ? (priceOf.get(t.feeSymbol) ?? 0) : 0);
    const k = dayKey(t.createdAt);
    dayVol.set(k, (dayVol.get(k) ?? 0) + notional);
  }

  // Fill a contiguous 30-day window so the chart has no gaps.
  const series: VolumePoint[] = [];
  const today = new Date();
  for (let d = 29; d >= 0; d--) {
    const dt = new Date(today);
    dt.setUTCDate(dt.getUTCDate() - d);
    const k = dayKey(dt);
    series.push({ date: k, volumeUsd: dayVol.get(k) ?? 0 });
  }

  // Activity grouped by ledger type — count + net USD flow.
  const typeAgg = new Map<string, { count: number; netUsd: number }>();
  for (const e of ledger) {
    const cur = typeAgg.get(e.type) ?? { count: 0, netUsd: 0 };
    cur.count += 1;
    cur.netUsd += usd(e.symbol, Number(e.delta));
    typeAgg.set(e.type, cur);
  }
  const byType: TypeStat[] = [...typeAgg.entries()]
    .map(([type, v]) => ({ type, count: v.count, netUsd: v.netUsd }))
    .sort((a, b) => b.count - a.count);

  return {
    totalUsd: portfolio.totalUsd,
    change24hUsd,
    change24hPct,
    assets: sliceAssets,
    totals: { trades: trades.length, volumeUsd, feesUsd },
    byType,
    volumeSeries: series,
    generatedAt: Date.now(),
  };
}
