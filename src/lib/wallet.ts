import { LedgerAccount, LedgerType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getExchange } from "@/lib/exchange";
import { WALLET_ASSETS } from "@/lib/assets";
import { ensureAssets } from "@/lib/seed";
import type { Portfolio } from "@/lib/wallet-types";

/**
 * Create the user's wallets (seeded with demo balances) if they don't exist,
 * recording the opening balances as SEED ledger entries so the journal is
 * complete from the first cent.
 */
export async function ensureWallets(userId: string): Promise<void> {
  await ensureAssets();
  const existing = await prisma.wallet.findMany({
    where: { userId },
    select: { symbol: true },
  });
  const have = new Set(existing.map((w) => w.symbol));
  const missing = WALLET_ASSETS.filter((a) => !have.has(a.symbol));
  if (missing.length === 0) return;

  try {
    await prisma.$transaction(async (tx) => {
      for (const a of missing) {
        await tx.wallet.create({ data: { userId, symbol: a.symbol, balance: a.seed } });
        if (a.seed > 0) {
          await tx.ledgerEntry.create({
            data: {
              userId,
              symbol: a.symbol,
              account: LedgerAccount.AVAILABLE,
              delta: a.seed,
              balanceAfter: a.seed,
              type: LedgerType.SEED,
              memo: "Welcome demo balance",
            },
          });
        }
      }
    });
  } catch (e) {
    // A concurrent request seeded the same wallets first — that's fine.
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
  }
}

/** Balances valued in USD using live prices. `balance` is available; `locked` is reserved. */
export async function getPortfolio(userId: string): Promise<Portfolio> {
  await ensureWallets(userId);
  const [wallets, assets] = await Promise.all([
    prisma.wallet.findMany({ where: { userId }, include: { asset: true } }),
    getExchange().listSwapAssets(),
  ]);
  const priceMap = new Map(assets.map((a) => [a.symbol, a.usdtPrice]));

  const items = wallets.map((w) => {
    const balance = Number(w.balance);
    const locked = Number(w.locked);
    const price = w.symbol === "USDT" ? 1 : (priceMap.get(w.symbol) ?? 0);
    return {
      symbol: w.symbol,
      name: w.asset.name,
      balance,
      locked,
      usdValue: (balance + locked) * price,
      price,
    };
  });
  items.sort((a, b) => b.usdValue - a.usdValue);
  const totalUsd = items.reduce((s, i) => s + i.usdValue, 0);
  return { items, totalUsd };
}
