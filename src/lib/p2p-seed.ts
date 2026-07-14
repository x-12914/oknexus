import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { OrderSide, P2PMerchant } from "@/lib/exchange/types";

// Seeded market-maker merchants + ads. These live in the DB alongside
// user-created ads (advertiserId = null marks them as house liquidity).

const M: Record<string, P2PMerchant> = {
  m1: { id: "m1", name: "USDTBaron", online: true, completedTrades: 5623, completionRatePct: 99.8, avgReleaseMinutes: 2, rating: 4.9, verified: true },
  m2: { id: "m2", name: "CryptoKingNG", online: true, completedTrades: 1240, completionRatePct: 98.5, avgReleaseMinutes: 5, rating: 4.8, verified: true },
  m3: { id: "m3", name: "FastTrade_Wise", online: true, completedTrades: 890, completionRatePct: 99.2, avgReleaseMinutes: 3, rating: 4.9, verified: true },
  m4: { id: "m4", name: "AlphaOTC", online: false, completedTrades: 2310, completionRatePct: 97.0, avgReleaseMinutes: 8, rating: 4.6, verified: true },
  m5: { id: "m5", name: "SwiftPay", online: true, completedTrades: 452, completionRatePct: 95.5, avgReleaseMinutes: 6, rating: 4.5, verified: false },
  m6: { id: "m6", name: "GreenExchange", online: false, completedTrades: 121, completionRatePct: 92.0, avgReleaseMinutes: 12, rating: 4.2, verified: false },
};

interface SeedAd {
  id: string;
  side: OrderSide;
  asset: string;
  fiat: string;
  price: number;
  available: number;
  minLimit: number;
  maxLimit: number;
  paymentMethods: string[];
  terms?: string;
  merchant: string;
}

const ADS: SeedAd[] = [
  { id: "a1", side: "SELL", asset: "USDT", fiat: "USD", price: 1.001, available: 45000, minLimit: 100, maxLimit: 20000, paymentMethods: ["bank", "wise", "zelle"], terms: "Release fast. Bank transfer must match your verified name.", merchant: "m1" },
  { id: "a2", side: "SELL", asset: "USDT", fiat: "USD", price: 1.003, available: 12500, minLimit: 50, maxLimit: 5000, paymentMethods: ["revolut", "wise"], merchant: "m3" },
  { id: "a3", side: "BUY", asset: "USDT", fiat: "USD", price: 0.998, available: 30000, minLimit: 200, maxLimit: 15000, paymentMethods: ["bank", "zelle"], merchant: "m4" },
  { id: "a4", side: "BUY", asset: "USDT", fiat: "USD", price: 0.996, available: 8000, minLimit: 50, maxLimit: 3000, paymentMethods: ["paypal", "cashapp"], merchant: "m5" },
  { id: "a5", side: "SELL", asset: "USDT", fiat: "NGN", price: 1655, available: 60000, minLimit: 50000, maxLimit: 20000000, paymentMethods: ["bank", "momo"], terms: "Opay/Palmpay/Bank. Do not write crypto in narration.", merchant: "m2" },
  { id: "a6", side: "SELL", asset: "USDT", fiat: "NGN", price: 1662, available: 25000, minLimit: 20000, maxLimit: 5000000, paymentMethods: ["bank"], merchant: "m6" },
  { id: "a7", side: "BUY", asset: "USDT", fiat: "NGN", price: 1648, available: 40000, minLimit: 100000, maxLimit: 10000000, paymentMethods: ["bank", "momo"], merchant: "m2" },
  { id: "a8", side: "SELL", asset: "BTC", fiat: "USD", price: 68950, available: 3.5, minLimit: 500, maxLimit: 60000, paymentMethods: ["bank", "wise"], merchant: "m1" },
  { id: "a9", side: "BUY", asset: "BTC", fiat: "USD", price: 68150, available: 2.1, minLimit: 500, maxLimit: 40000, paymentMethods: ["bank", "zelle"], merchant: "m4" },
  { id: "a10", side: "SELL", asset: "USDT", fiat: "EUR", price: 0.932, available: 18000, minLimit: 100, maxLimit: 8000, paymentMethods: ["sepa", "revolut"], merchant: "m3" },
  { id: "a11", side: "BUY", asset: "USDT", fiat: "EUR", price: 0.928, available: 9500, minLimit: 100, maxLimit: 6000, paymentMethods: ["sepa"], merchant: "m5" },
  { id: "a12", side: "SELL", asset: "ETH", fiat: "USD", price: 3560, available: 40, minLimit: 300, maxLimit: 30000, paymentMethods: ["bank", "wise", "revolut"], merchant: "m1" },
];

let seeded = false;

/** Insert the house-liquidity ads once per boot (idempotent upsert by id). */
export async function ensureP2PAds(): Promise<void> {
  if (seeded) return;
  await prisma.$transaction(
    ADS.map((a) =>
      prisma.p2PAd.upsert({
        where: { id: a.id },
        update: {},
        create: {
          id: a.id,
          advertiserId: null,
          side: a.side,
          asset: a.asset,
          fiat: a.fiat,
          price: a.price,
          available: a.available,
          minLimit: a.minLimit,
          maxLimit: a.maxLimit,
          paymentMethods: a.paymentMethods,
          terms: a.terms ?? null,
          merchantName: M[a.merchant].name,
          merchant: M[a.merchant] as unknown as Prisma.InputJsonValue,
          active: true,
        },
      }),
    ),
  );
  seeded = true;
}
