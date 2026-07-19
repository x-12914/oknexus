import { LedgerAccount } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { LedgerActivity } from "@/lib/wallet-types";

/**
 * Recent spendable-balance movements — the user's account statement. We show
 * only AVAILABLE-account legs so each row is a real change to what they can
 * spend (the paired LOCKED legs are internal escrow bookkeeping).
 */
export async function getActivity(userId: string, limit = 40): Promise<LedgerActivity[]> {
  const entries = await prisma.ledgerEntry.findMany({
    where: { userId, account: LedgerAccount.AVAILABLE },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return entries.map((e) => ({
    id: e.id,
    symbol: e.symbol,
    delta: Number(e.delta),
    balanceAfter: Number(e.balanceAfter),
    type: e.type,
    memo: e.memo,
    createdAt: e.createdAt.getTime(),
  }));
}
