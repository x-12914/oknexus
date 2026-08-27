import { LedgerType, type Withdrawal } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withLedger, lock, unlock, settleLocked, quantize } from "@/lib/ledger";
import { notify } from "@/lib/notifications";
import { getExchange } from "@/lib/exchange";
import { getChainAdapter } from "./registry";
import { WITHDRAWAL_MARGIN_PCT } from "@/lib/fees";

// Floor per asset, used only when the chain can't be reached or can't price
// the asset. The real figure is measured live — see withdrawFee below.
const WITHDRAW_FEES: Record<string, number> = {
  ETH: 0.0004,
  USDT: 1,
  USDC: 1,
  SOL: 0.008,
  BTC: 0.00006,
};

/**
 * Withdrawal fee: live network cost plus a margin.
 *
 * A BTC transaction and an ERC-20 transfer cost wildly different amounts and
 * both move with demand, so the cost is measured per chain rather than read
 * from a table. WITHDRAWAL_MARGIN_PCT on top is the secondary revenue.
 *
 * WITHDRAW_FEES is now only a floor, used when a chain can't be reached or
 * can't price the asset (ERC-20s, whose gas is paid in ETH). Charging nothing
 * because an RPC hiccuped would mean eating the network cost.
 */
const FEE_TTL_MS = 30_000;
const feeCache = new Map<string, { at: number; value: number }>();

export async function withdrawFee(chain: string, symbol: string): Promise<number> {
  const key = `${chain}:${symbol}`;
  const hit = feeCache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < FEE_TTL_MS) return hit.value;

  let value = WITHDRAW_FEES[symbol] ?? 0;
  try {
    const measured = await getChainAdapter(chain).estimateNetworkFee(symbol);
    if (measured > 0) value = quantize(measured * (1 + WITHDRAWAL_MARGIN_PCT));
  } catch {
    // Keep the floor: a fee lookup failing must not make withdrawals free.
  }
  feeCache.set(key, { at: now, value });
  return value;
}

export class DailyLimitError extends Error {}

/**
 * Rolling-24h withdrawal cap in USD.
 *
 * The old 50,000 default was written when this was a simulated demo and nothing
 * left the building. It now governs a real payout rail, so the default is
 * deliberately conservative — raise it explicitly, ideally per KYC tier.
 */
const DAILY_LIMIT_USD = Number(process.env.WITHDRAW_DAILY_USD_LIMIT ?? 2000);

/**
 * Dual-control threshold in USD.
 *
 * Withdrawals at or above this sit in PENDING_APPROVAL until a second person
 * releases them. RBAC alone means one compromised admin account can drain the
 * treasury; requiring a different human to approve is the control that actually
 * stops that. 0 disables approval entirely.
 */
const APPROVAL_THRESHOLD_USD = Number(process.env.WITHDRAW_APPROVAL_USD ?? 1000);

export interface DailyLimitStatus {
  limitUsd: number;
  usedUsd: number;
  remainingUsd: number;
}

/**
 * USD prices for valuing the cap.
 *
 * This is a NETWORK call. Fetch it before opening a transaction and pass the
 * result in — running it inside one holds a connection and the per-user
 * advisory lock while waiting on a third party, which blew Prisma's 5s
 * interactive-transaction timeout and failed every withdrawal.
 */
export async function usdPriceMap(): Promise<Map<string, number>> {
  const assets = await getExchange().listSwapAssets();
  const m = new Map<string, number>(assets.map((a) => [a.symbol, a.usdtPrice]));
  m.set("USDT", 1);
  return m;
}

/**
 * The user's non-failed withdrawal usage over the last 24h vs the configured cap.
 *
 * Counts BOTH rails: on-chain withdrawals and fiat off-ramp payouts. They drain
 * the same balances, so leaving payouts out would make the cap trivially
 * bypassable by cashing out to a bank instead of an address.
 */
type Db = Pick<typeof prisma, "withdrawal" | "fiatPayout">;

export async function dailyLimitStatus(
  userId: string,
  db: Db = prisma,
  pricesIn?: Map<string, number>,
): Promise<DailyLimitStatus> {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const [rows, payouts, prices] = await Promise.all([
    db.withdrawal.findMany({
      where: { userId, status: { not: "FAILED" }, createdAt: { gte: since } },
      select: { symbol: true, amount: true },
    }),
    db.fiatPayout.findMany({
      where: { userId, status: { not: "FAILED" }, createdAt: { gte: since } },
      select: { fromSymbol: true, fromAmount: true },
    }),
    pricesIn ? Promise.resolve(pricesIn) : usdPriceMap(),
  ]);
  const usedUsd =
    rows.reduce((s, r) => s + Number(r.amount) * (prices.get(r.symbol) ?? 0), 0) +
    payouts.reduce((s, r) => s + Number(r.fromAmount) * (prices.get(r.fromSymbol) ?? 0), 0);
  return { limitUsd: DAILY_LIMIT_USD, usedUsd, remainingUsd: Math.max(0, DAILY_LIMIT_USD - usedUsd) };
}

/** Throw DailyLimitError if this withdrawal would push the rolling-24h total over the cap. */
export async function assertWithinDailyLimit(
  userId: string,
  symbol: string,
  amount: number,
  db: Db = prisma,
  pricesIn?: Map<string, number>,
): Promise<void> {
  if (!(DAILY_LIMIT_USD > 0)) return;
  // Only the usage sum needs to run inside the caller's transaction. Prices are
  // uncontended, so callers holding a lock fetch them first and pass them in.
  const prices = pricesIn ?? (await usdPriceMap());
  const { usedUsd, remainingUsd } = await dailyLimitStatus(userId, db, prices);
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

  const fee = await withdrawFee(chain, symbol);
  const total = amount + fee;
  // Priced before the transaction opens — see usdPriceMap.
  const prices = await usdPriceMap();
  return withLedger(async (tx) => {
    // Serialize per user, then check the cap inside the same transaction. The
    // route used to assert the limit beforehand, which two concurrent requests
    // could both satisfy before either had locked anything.
    // $executeRaw, not $queryRaw: the function returns void and Prisma cannot
    // deserialize a void column, which made every call throw.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId})::bigint)`;
    await assertWithinDailyLimit(userId, symbol, amount, tx, prices);

    const usdValue = amount * (prices.get(symbol) ?? 0);
    const needsApproval = APPROVAL_THRESHOLD_USD > 0 && usdValue >= APPROVAL_THRESHOLD_USD;

    const w = await tx.withdrawal.create({
      data: {
        userId,
        chain,
        symbol,
        amount,
        fee,
        toAddress,
        // processWithdrawals only picks up REQUESTED, so PENDING_APPROVAL is
        // held back from the broadcaster without needing a separate guard.
        status: needsApproval ? "PENDING_APPROVAL" : "REQUESTED",
      },
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


export class ApprovalError extends Error {}

/**
 * Release a withdrawal that is waiting on dual control.
 *
 * The approver must be a different person from the requester. Letting someone
 * approve their own withdrawal would make the whole control decorative — which
 * is precisely the gap between this and plain role-based access.
 */
export async function approveWithdrawal(
  withdrawalId: string,
  approverId: string,
): Promise<{ id: string; status: string }> {
  const w = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
  if (!w) throw new ApprovalError("Withdrawal not found.");
  if (w.status !== "PENDING_APPROVAL") {
    throw new ApprovalError(`That withdrawal is ${w.status}, not awaiting approval.`);
  }
  if (w.userId === approverId) {
    throw new ApprovalError("A withdrawal can't be approved by the person who requested it.");
  }

  // Guarded transition so two approvers clicking at once can't both release it.
  const claim = await prisma.withdrawal.updateMany({
    where: { id: withdrawalId, status: "PENDING_APPROVAL" },
    data: { status: "REQUESTED", approvedBy: approverId, approvedAt: new Date() },
  });
  if (claim.count === 0) throw new ApprovalError("That withdrawal was already actioned.");
  return { id: withdrawalId, status: "REQUESTED" };
}

/** Reject a pending withdrawal and return the locked funds. */
export async function rejectWithdrawal(
  withdrawalId: string,
  approverId: string,
  reason: string,
): Promise<void> {
  const w = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
  if (!w) throw new ApprovalError("Withdrawal not found.");
  if (w.status !== "PENDING_APPROVAL") {
    throw new ApprovalError(`That withdrawal is ${w.status}, not awaiting approval.`);
  }
  if (w.userId === approverId) {
    throw new ApprovalError("A withdrawal can't be actioned by the person who requested it.");
  }

  await withLedger(async (tx) => {
    const claim = await tx.withdrawal.updateMany({
      where: { id: withdrawalId, status: "PENDING_APPROVAL" },
      data: { status: "FAILED", approvedBy: approverId, approvedAt: new Date(), error: reason },
    });
    if (claim.count === 0) throw new ApprovalError("That withdrawal was already actioned.");
    // Nothing was ever broadcast, so the reserved funds go straight back.
    await unlock(tx, w.userId, w.symbol, Number(w.amount) + Number(w.fee), {
      type: LedgerType.WITHDRAWAL,
      refId: w.id,
      memo: "Withdrawal rejected",
    });
  });

  await notify(w.userId, {
    type: "WITHDRAWAL",
    title: "Withdrawal declined",
    body: `Your ${w.symbol} withdrawal was declined and the funds are back in your balance.`,
    href: "/withdraw",
  });
}

/** Withdrawals waiting on a second approver. */
export async function listPendingApprovals() {
  const rows = await prisma.withdrawal.findMany({
    where: { status: "PENDING_APPROVAL" },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return rows.map((w) => ({
    id: w.id,
    userId: w.userId,
    chain: w.chain,
    symbol: w.symbol,
    amount: Number(w.amount),
    fee: Number(w.fee),
    toAddress: w.toAddress,
    createdAt: w.createdAt.getTime(),
  }));
}
