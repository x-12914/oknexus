import { prisma } from "@/lib/db";
import { WALLET_ASSETS } from "@/lib/assets";

// Canonical spot markets. All quote in USDT, so spot settlement only ever
// touches on-ledger wallets (crypto + USDT).
export interface MarketMeta {
  symbol: string; // "BTC/USDT"
  base: string;
  quote: string;
  tickSize: number;
  stepSize: number;
  makerFee: number;
  takerFee: number;
}

export const MARKETS: MarketMeta[] = [
  { symbol: "BTC/USDT", base: "BTC", quote: "USDT", tickSize: 0.1, stepSize: 0.000001, makerFee: 0.001, takerFee: 0.002 },
  { symbol: "ETH/USDT", base: "ETH", quote: "USDT", tickSize: 0.01, stepSize: 0.0001, makerFee: 0.001, takerFee: 0.002 },
  { symbol: "SOL/USDT", base: "SOL", quote: "USDT", tickSize: 0.01, stepSize: 0.01, makerFee: 0.001, takerFee: 0.002 },
  { symbol: "BNB/USDT", base: "BNB", quote: "USDT", tickSize: 0.01, stepSize: 0.001, makerFee: 0.001, takerFee: 0.002 },
  { symbol: "XRP/USDT", base: "XRP", quote: "USDT", tickSize: 0.0001, stepSize: 1, makerFee: 0.001, takerFee: 0.002 },
  { symbol: "ADA/USDT", base: "ADA", quote: "USDT", tickSize: 0.0001, stepSize: 1, makerFee: 0.001, takerFee: 0.002 },
];

export function marketMeta(symbol: string): MarketMeta | undefined {
  return MARKETS.find((m) => m.symbol === symbol);
}

let assetsSeeded = false;

/** Idempotent; process-cached so it only hits the DB once per boot. */
export async function ensureAssets(): Promise<void> {
  if (assetsSeeded) return;
  await prisma.$transaction(
    WALLET_ASSETS.map((a) =>
      prisma.asset.upsert({
        where: { symbol: a.symbol },
        update: {},
        create: { symbol: a.symbol, name: a.name, isFiat: a.isFiat, decimals: a.decimals },
      }),
    ),
  );
  assetsSeeded = true;
}

let marketsSeeded = false;

export async function ensureMarkets(): Promise<void> {
  if (marketsSeeded) return;
  await ensureAssets();
  await prisma.$transaction(
    MARKETS.map((m) =>
      prisma.market.upsert({
        where: { symbol: m.symbol },
        update: {},
        create: {
          symbol: m.symbol,
          baseSymbol: m.base,
          quoteSymbol: m.quote,
          tickSize: m.tickSize,
          stepSize: m.stepSize,
          makerFee: m.makerFee,
          takerFee: m.takerFee,
        },
      }),
    ),
  );
  marketsSeeded = true;
}
