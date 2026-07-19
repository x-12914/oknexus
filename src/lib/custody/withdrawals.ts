import { LedgerType, type Withdrawal } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withLedger, lock, unlock, settleLocked, quantize } from "@/lib/ledger";
import { notify } from "@/lib/notifications";
import { getExchange } from "@/lib/exchange";
import { getChainAdapter } from "./registry";

// Flat network fee per asset, charged on withdrawal and kept by the platform
// (the hot wallet pays the real on-chain gas). A richer per-chain schedule can
// slot in here later.
const WITHDRAW_FEES: Record<string, number> = {
  ETH: 0.0004,
  USDT: 1,
  USDC: 1,
  SOL: 0.008,
  BTC: 0.00006,
};

/** Flat withdrawal fee for an asset (0 if none configured). */
export function withdrawFee(symbol: string): number {
  return WITHDRAW_FEES[symbol] ?? 0;
}

export class DailyLimitError extends Error {}

// Rolling-24h withdrawal cap in USD (0 / unset = no limit).
const DAILY_LIMIT_USD = Number(process.env.WITHDRAW_DAILY_USD_LIMIT ?? 50000);

export interface DailyLimitStatus {
  limitUsd: number;
  usedUsd: number;
  remainingUsd: number;
}

async function usdPriceMap(): Promise<Map<string, number>> {
  const assets = await getExchange().listSwapAssets();
  const m = new Map<string, number>(assets.map((a) => [a.symbol, a.usdtPrice]));
  m.set("USDT", 1);
  return m;
}

/** The user's non-failed withdrawal usage over the last 24h vs the configured cap. */
export async function dailyLimitStatus(userId: string): Promise<DailyLimitStatus> {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const [rows, prices] = await Promise.all([
    prisma.withdrawal.findMany({
      where: { userId, status: { not: "FAILED" }, createdAt: { gte: since } },
      select: { symbol: true, amount: true },
    }),
    usdPriceMap(),
  ]);
  const usedUsd = rows.reduce((s, r) => s + Number(r.amount) * (prices.get(r.symbol) ?? 0), 0);
  return { limitUsd: DAILY_LIMIT_USD, usedUsd, remainingUsd: Math.max(0, DAILY_LIMIT_USD - usedUsd) };
}

/** Throw DailyLimitError if this withdrawal would push the rolling-24h total over the cap. */
export async function assertWithinDailyLimit(
  userId: string,
  symbol: string,
  amount: number,
): Promise<void> {
  if (!(DAILY_LIMIT_USD > 0)) return;
  const [{ usedUsd, remainingUsd }, prices] = await Promise.all([
    dailyLimitStatus(userId),
    usdPriceMap(),
  ]);
  const thisUsd = amount * (prices.get(symbol) ?? 0);
  if (usedUsd + thisUsd > DAILY_LIMIT_USD) {
    throw new DailyLimitError(
      `Daily withdrawal limit reached — about $${remainingUsd.toFixed(0)} left in the next 24h.`,
    );
  }
}

function supportsSymbol(chain: string, symbol: string): boolean {
  const c = getChainAdapter(chain).config;
  return symbol === c.nativeSymbol || c.tokens.some((t) => t.symbol === symbol);
}

/**
 * Request a withdrawal: validate, then LOCK the funds and record it REQUESTED.
 * Locking (not debiting) means the balance is reserved but only leaves the
 * account once the on-chain tx confirms — and is returned if it fails.
 */
export async function requestWithdrawal(
  userId: string,
  chain: string,
  symbol: string,
  amount: number,
  toAddress: string,
): Promise<Withdrawal> {
  const adapter = getChainAdapter(chain);
  if (!supportsSymbol(chain, symbol)) {
    throw new Error(`Withdrawals for ${symbol} aren't supported on ${chain}`);
  }
  if (!adapter.validateAddress(toAddress)) throw new Error("Invalid destination address");
  amount = quantize(amount);
  if (!(amount > 0)) throw new Error("Amount must be positive");

  const fee = withdrawFee(symbol);
  const total = amount + fee;
  return withLedger(async (tx) => {
    const w = await tx.withdrawal.create({
      data: { userId, chain, symbol, amount, fee, toAddress, status: "REQUESTED" },
    });
    await lock(tx, userId, symbol, total, {
      type: LedgerType.WITHDRAWAL,
      refId: w.id,
      memo: `Withdraw ${symbol}`,
    });
    return w;
  });
}

export interface ProcessResult {
  broadcast: number;
  confirmed: number;
  failed: number;
}

/**
 * One withdrawal-processing pass: broadcast REQUESTED withdrawals from the hot
 * wallet, then settle BROADCAST ones once confirmed (or refund on failure).
 */
export async function processWithdrawals(chain: string): Promise<ProcessResult> {
  const adapter = getChainAdapter(chain);
  const minConf = adapter.config.minConfirmations;
  const tip = await adapter.getBlockNumber();
  const result: ProcessResult = { broadcast: 0, confirmed: 0, failed: 0 };

  // 1. Broadcast newly requested withdrawals.
  const requested = await prisma.withdrawal.findMany({
    where: { chain, status: "REQUESTED" },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  for (const w of requested) {
    // Atomically CLAIM the row (REQUESTED→BROADCAST) *before* broadcasting, so two
    // overlapping passes (or a crash-retry) can never send the same withdrawal twice.
    const claim = await prisma.withdrawal.updateMany({
      where: { id: w.id, status: "REQUESTED" },
      data: { status: "BROADCAST" },
    });
    if (claim.count === 0) continue; // already claimed by another pass
    try {
      const txHash = await adapter.sendWithdrawal(w.symbol, w.toAddress, Number(w.amount));
      await prisma.withdrawal.update({ where: { id: w.id }, data: { txHash } });
      result.broadcast++;
    } catch (e) {
      // The send threw *after* we claimed — the tx may or may not have reached the
      // network. Do NOT auto-refund (that risks paying the user twice). Leave it
      // BROADCAST with no txHash + the error, for manual reconciliation against chain.
      await prisma.withdrawal.update({
        where: { id: w.id },
        data: { error: String((e as Error).message).slice(0, 300) },
      });
      result.failed++;
    }
  }

  // 2. Settle broadcast withdrawals once mined + confirmed.
  const broadcast = await prisma.withdrawal.findMany({
    where: { chain, status: "BROADCAST" },
    take: 20,
  });
  for (const w of broadcast) {
    if (!w.txHash) continue;
    const total = Number(w.amount) + Number(w.fee);
    const st = await adapter.getTransaction(w.txHash);
    if (!st.mined) continue;

    if (!st.success) {
      // Reverted on-chain — refund the locked funds.
      const reverted = await withLedger(async (tx) => {
        const upd = await tx.withdrawal.updateMany({
          where: { id: w.id, status: "BROADCAST" },
          data: { status: "FAILED", error: "Transaction reverted on-chain" },
        });
        if (upd.count === 0) return false;
        await unlock(tx, w.userId, w.symbol, total, {
          type: LedgerType.WITHDRAWAL,
          refId: w.id,
          memo: `Withdraw reverted ${w.symbol}`,
        });
        return true;
      });
      if (reverted) {
        await notify(w.userId, {
          type: "WITHDRAWAL",
          title: "Withdrawal failed",
          body: `Your ${Number(w.amount)} ${w.symbol} withdrawal reverted on-chain — the funds were returned to your balance.`,
          href: "/withdraw",
        });
      }
      result.failed++;
      continue;
    }

    const confirmations = Number(tip - st.blockNumber) + 1;
    if (confirmations >= minConf) {
      // Confirmed — the locked funds now leave the account for good.
      const confirmed = await withLedger(async (tx) => {
        const upd = await tx.withdrawal.updateMany({
          where: { id: w.id, status: "BROADCAST" },
          data: { status: "CONFIRMED" },
        });
        if (upd.count === 0) return false;
        await settleLocked(tx, w.userId, w.symbol, total, {
          type: LedgerType.WITHDRAWAL,
          refId: w.id,
          memo: `Withdraw ${w.symbol}`,
        });
        return true;
      });
      if (confirmed) {
        await notify(w.userId, {
          type: "WITHDRAWAL",
          title: "Withdrawal sent",
          body: `Your ${Number(w.amount)} ${w.symbol} withdrawal was confirmed on-chain.`,
          href: "/withdraw",
        });
      }
      result.confirmed++;
    }
  }

  return result;
}
