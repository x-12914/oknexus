import "server-only";
import { LedgerType, type StakePosition } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getExchange } from "@/lib/exchange";
import { withLedger, lock, unlock, credit, quantize, InsufficientBalanceError } from "@/lib/ledger";
import { notify } from "@/lib/notifications";
import type { EarnData, EarnProduct, StakeView } from "@/lib/earn-types";

export class EarnError extends Error {}

const YEAR_SECONDS = 365.25 * 24 * 3600;

// Flexible-staking products (no lock period). APYs are illustrative demo rates.
export const EARN_PRODUCTS: EarnProduct[] = [
  { symbol: "USDT", name: "Tether", apy: 8 },
  { symbol: "BTC", name: "Bitcoin", apy: 3.5 },
  { symbol: "ETH", name: "Ethereum", apy: 4.2 },
  { symbol: "SOL", name: "Solana", apy: 6.5 },
];
const APY_OF = new Map(EARN_PRODUCTS.map((p) => [p.symbol, p.apy]));

function pendingReward(p: StakePosition, nowMs: number): number {
  const elapsed = (nowMs - p.lastAccrued.getTime()) / 1000;
  if (elapsed <= 0) return 0;
  return Number(p.principal) * (Number(p.apy) / 100) * (elapsed / YEAR_SECONDS);
}

function toView(p: StakePosition, nowMs: number): StakeView {
  return {
    id: p.id,
    symbol: p.symbol,
    principal: Number(p.principal),
    apy: Number(p.apy),
    accrued: Number(p.accrued) + pendingReward(p, nowMs),
    createdAt: p.createdAt.getTime(),
  };
}

export async function getEarn(userId: string): Promise<EarnData> {
  const nowMs = Date.now();
  const [positions, assets] = await Promise.all([
    prisma.stakePosition.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    }),
    getExchange().listSwapAssets(),
  ]);
  const prices: Record<string, number> = { USDT: 1 };
  for (const a of assets) if (APY_OF.has(a.symbol)) prices[a.symbol] = a.usdtPrice;
  return { products: EARN_PRODUCTS, positions: positions.map((p) => toView(p, nowMs)), prices };
}

export async function stake(userId: string, symbolRaw: string, amount: number): Promise<StakeView> {
  const symbol = symbolRaw.trim().toUpperCase();
  const apy = APY_OF.get(symbol);
  if (apy == null) throw new EarnError("This asset isn't available to stake.");
  amount = quantize(amount);
  if (!(amount > 0)) throw new EarnError("Enter an amount greater than zero.");

  try {
    const pos = await withLedger(async (tx) => {
      const p = await tx.stakePosition.create({ data: { userId, symbol, principal: amount, apy } });
      // Lock the principal (moves AVAILABLE → LOCKED; it can't be spent while staked).
      await lock(tx, userId, symbol, amount, {
        type: LedgerType.STAKE,
        refId: p.id,
        memo: `Stake ${symbol}`,
      });
      return p;
    });
    return toView(pos, Date.now());
  } catch (e) {
    if (e instanceof InsufficientBalanceError) throw new EarnError(`Insufficient ${symbol} balance.`);
    throw e;
  }
}

export async function unstake(
  userId: string,
  id: string,
): Promise<{ symbol: string; principal: number; reward: number }> {
  const now = new Date();
  const result = await withLedger(async (tx) => {
    const p = await tx.stakePosition.findFirst({ where: { id, userId, status: "ACTIVE" } });
    if (!p) throw new EarnError("Stake not found.");
    const reward = Number(p.accrued) + pendingReward(p, now.getTime());
    const principal = Number(p.principal);

    // Atomically claim the position (ACTIVE→CLOSED) *before* touching the ledger, so
    // two concurrent unstakes can't both unlock the principal or credit the reward.
    const claim = await tx.stakePosition.updateMany({
      where: { id: p.id, status: "ACTIVE" },
      data: { status: "CLOSED", accrued: reward, closedAt: now },
    });
    if (claim.count === 0) throw new EarnError("Stake not found.");

    // Return the locked principal, then credit the accrued yield.
    await unlock(tx, userId, p.symbol, principal, {
      type: LedgerType.STAKE,
      refId: p.id,
      memo: `Unstake ${p.symbol}`,
    });
    if (reward > 0) {
      await credit(tx, userId, p.symbol, reward, {
        type: LedgerType.STAKE,
        refId: p.id,
        memo: `Staking rewards ${p.symbol}`,
      });
    }
    return { symbol: p.symbol, principal, reward };
  });

  await notify(userId, {
    type: "SYSTEM",
    title: "Unstaked",
    body: `Unstaked ${result.principal} ${result.symbol} + ${result.reward.toFixed(6)} ${result.symbol} in rewards.`,
    href: "/earn",
  });
  return result;
}

/** Accrue rewards on every active position. Called from the cron each minute. */
export async function accrueStakes(): Promise<{ accrued: number }> {
  const now = new Date();
  const active = await prisma.stakePosition.findMany({ where: { status: "ACTIVE" }, take: 2000 });
  let accrued = 0;
  for (const p of active) {
    const reward = pendingReward(p, now.getTime());
    if (reward <= 0) continue;
    await prisma.stakePosition.update({
      where: { id: p.id },
      data: { accrued: { increment: reward }, lastAccrued: now },
    });
    accrued++;
  }
  return { accrued };
}
