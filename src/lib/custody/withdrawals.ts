import { LedgerType, type Withdrawal } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withLedger, lock, unlock, settleLocked } from "@/lib/ledger";
import { notify } from "@/lib/notifications";
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
    const total = Number(w.amount) + Number(w.fee);
    try {
      const txHash = await adapter.sendWithdrawal(w.symbol, w.toAddress, Number(w.amount));
      await prisma.withdrawal.update({
        where: { id: w.id },
        data: { status: "BROADCAST", txHash },
      });
      result.broadcast++;
    } catch (e) {
      // Couldn't broadcast — return the locked funds.
      const reverted = await withLedger(async (tx) => {
        const upd = await tx.withdrawal.updateMany({
          where: { id: w.id, status: "REQUESTED" },
          data: { status: "FAILED", error: String((e as Error).message).slice(0, 300) },
        });
        if (upd.count === 0) return false;
        await unlock(tx, w.userId, w.symbol, total, {
          type: LedgerType.WITHDRAWAL,
          refId: w.id,
          memo: `Withdraw failed ${w.symbol}`,
        });
        return true;
      });
      if (reverted) {
        await notify(w.userId, {
          type: "WITHDRAWAL",
          title: "Withdrawal failed",
          body: `Your ${Number(w.amount)} ${w.symbol} withdrawal couldn't be sent — the funds were returned to your balance.`,
          href: "/withdraw",
        });
      }
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
