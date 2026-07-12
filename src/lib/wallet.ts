import { prisma } from "@/lib/db";
import { getExchange } from "@/lib/exchange";
import { WALLET_ASSETS } from "@/lib/assets";
import type { Portfolio } from "@/lib/wallet-types";

let assetsSeeded = false;

// Idempotent; process-cached so it only hits the DB once per boot.
async function ensureAssets() {
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

/** Create the user's wallets (seeded with demo balances) if they don't exist. */
export async function ensureWallets(userId: string): Promise<void> {
  await ensureAssets();
  await prisma.$transaction(
    WALLET_ASSETS.map((a) =>
      prisma.wallet.upsert({
        where: { userId_symbol: { userId, symbol: a.symbol } },
        update: {},
        create: { userId, symbol: a.symbol, balance: a.seed },
      }),
    ),
  );
}

/** Balances valued in USD using live prices. */
export async function getPortfolio(userId: string): Promise<Portfolio> {
  await ensureWallets(userId);
  const [wallets, assets] = await Promise.all([
    prisma.wallet.findMany({ where: { userId }, include: { asset: true } }),
    getExchange().listSwapAssets(),
  ]);
  const priceMap = new Map(assets.map((a) => [a.symbol, a.usdtPrice]));

  const items = wallets.map((w) => {
    const balance = Number(w.balance);
    const price = w.symbol === "USDT" ? 1 : (priceMap.get(w.symbol) ?? 0);
    return { symbol: w.symbol, name: w.asset.name, balance, usdValue: balance * price, price };
  });
  items.sort((a, b) => b.usdValue - a.usdValue);
  const totalUsd = items.reduce((s, i) => s + i.usdValue, 0);
  return { items, totalUsd };
}

/** Atomically move `fromAmount` of one asset into `toAmount` of another. */
export async function settleSwap(
  userId: string,
  fromSymbol: string,
  fromAmount: number,
  toSymbol: string,
  toAmount: number,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const debited = await tx.wallet.updateMany({
      where: { userId, symbol: fromSymbol, balance: { gte: fromAmount } },
      data: { balance: { decrement: fromAmount } },
    });
    if (debited.count === 0) throw new Error("INSUFFICIENT_BALANCE");
    await tx.wallet.upsert({
      where: { userId_symbol: { userId, symbol: toSymbol } },
      update: { balance: { increment: toAmount } },
      create: { userId, symbol: toSymbol, balance: toAmount },
    });
  });
}
