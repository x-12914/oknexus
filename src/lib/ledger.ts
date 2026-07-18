import { LedgerAccount, LedgerType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Immutable-journal accounting over the Wallet table. Every movement mutates
// Wallet.balance (AVAILABLE) or Wallet.locked (LOCKED) *and* writes a signed
// LedgerEntry recording the resulting total. Balance guards use `updateMany`
// with a `gte` filter so a debit/lock can never drive an account negative even
// under concurrent requests — the row-level UPDATE is atomic.

type Tx = Prisma.TransactionClient;

/**
 * Round a user-supplied amount DOWN to `decimals` places (default 8, within the
 * ledger's Decimal(30,10) precision). Prevents sub-dust rounding abuse and rejects
 * amounts finer than an asset can hold; a sub-precision value floors to 0 and is then
 * caught by the caller's `amount > 0` guard.
 */
export function quantize(amount: number, decimals = 8): number {
  const f = 10 ** decimals;
  return Math.floor(amount * f) / f;
}

export class InsufficientBalanceError extends Error {
  readonly symbol?: string;
  constructor(symbol?: string) {
    super("INSUFFICIENT_BALANCE");
    this.name = "InsufficientBalanceError";
    this.symbol = symbol;
  }
}

export interface LedgerRef {
  type: LedgerType;
  /** Groups the legs of one logical operation (usually the persisted tx id). */
  refId?: string;
  memo?: string;
}

/** Run a settlement atomically. All ledger primitives must share the same `tx`. */
export function withLedger<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

async function balancesOf(tx: Tx, userId: string, symbol: string) {
  const w = await tx.wallet.findUnique({
    where: { userId_symbol: { userId, symbol } },
    select: { balance: true, locked: true },
  });
  return { balance: Number(w?.balance ?? 0), locked: Number(w?.locked ?? 0) };
}

function journal(
  tx: Tx,
  userId: string,
  symbol: string,
  account: LedgerAccount,
  delta: number,
  balanceAfter: number,
  ref: LedgerRef,
) {
  return tx.ledgerEntry.create({
    data: {
      userId,
      symbol,
      account,
      delta,
      balanceAfter,
      type: ref.type,
      refId: ref.refId,
      memo: ref.memo,
    },
  });
}

/** Increase available balance, creating the wallet if it doesn't exist yet. */
export async function credit(
  tx: Tx,
  userId: string,
  symbol: string,
  amount: number,
  ref: LedgerRef,
): Promise<void> {
  if (!(amount > 0)) return;
  const w = await tx.wallet.upsert({
    where: { userId_symbol: { userId, symbol } },
    update: { balance: { increment: amount } },
    create: { userId, symbol, balance: amount },
    select: { balance: true },
  });
  await journal(tx, userId, symbol, LedgerAccount.AVAILABLE, amount, Number(w.balance), ref);
}

/** Decrease available balance. Throws InsufficientBalanceError if short. */
export async function debit(
  tx: Tx,
  userId: string,
  symbol: string,
  amount: number,
  ref: LedgerRef,
): Promise<void> {
  if (!(amount > 0)) return;
  const res = await tx.wallet.updateMany({
    where: { userId, symbol, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (res.count === 0) throw new InsufficientBalanceError(symbol);
  const { balance } = await balancesOf(tx, userId, symbol);
  await journal(tx, userId, symbol, LedgerAccount.AVAILABLE, -amount, balance, ref);
}

/** Move funds from available into locked (e.g. an open limit order or escrow). */
export async function lock(
  tx: Tx,
  userId: string,
  symbol: string,
  amount: number,
  ref: LedgerRef,
): Promise<void> {
  if (!(amount > 0)) return;
  const res = await tx.wallet.updateMany({
    where: { userId, symbol, balance: { gte: amount } },
    data: { balance: { decrement: amount }, locked: { increment: amount } },
  });
  if (res.count === 0) throw new InsufficientBalanceError(symbol);
  const { balance, locked } = await balancesOf(tx, userId, symbol);
  await journal(tx, userId, symbol, LedgerAccount.AVAILABLE, -amount, balance, ref);
  await journal(tx, userId, symbol, LedgerAccount.LOCKED, amount, locked, ref);
}

/** Return locked funds to available (order cancelled / escrow refunded). */
export async function unlock(
  tx: Tx,
  userId: string,
  symbol: string,
  amount: number,
  ref: LedgerRef,
): Promise<void> {
  if (!(amount > 0)) return;
  const res = await tx.wallet.updateMany({
    where: { userId, symbol, locked: { gte: amount } },
    data: { locked: { decrement: amount }, balance: { increment: amount } },
  });
  if (res.count === 0) throw new InsufficientBalanceError(symbol);
  const { balance, locked } = await balancesOf(tx, userId, symbol);
  await journal(tx, userId, symbol, LedgerAccount.LOCKED, -amount, locked, ref);
  await journal(tx, userId, symbol, LedgerAccount.AVAILABLE, amount, balance, ref);
}

/** Consume locked funds — they leave the account (paid out on settlement). */
export async function settleLocked(
  tx: Tx,
  userId: string,
  symbol: string,
  amount: number,
  ref: LedgerRef,
): Promise<void> {
  if (!(amount > 0)) return;
  const res = await tx.wallet.updateMany({
    where: { userId, symbol, locked: { gte: amount } },
    data: { locked: { decrement: amount } },
  });
  if (res.count === 0) throw new InsufficientBalanceError(symbol);
  const { locked } = await balancesOf(tx, userId, symbol);
  await journal(tx, userId, symbol, LedgerAccount.LOCKED, -amount, locked, ref);
}
