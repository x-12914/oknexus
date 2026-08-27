import "server-only";
import { prisma } from "@/lib/db";
import { credit, withLedger, quantize } from "@/lib/ledger";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { bitnobConfigured, listTransactions, type BitnobTransaction } from "@/lib/bitnob";

/**
 * Detecting naira that has arrived.
 *
 * We poll rather than take webhooks. A webhook is a claim from the network that
 * money moved; a poll is us reading the provider's own ledger. For crediting
 * balances the second is the one worth trusting, and it degrades to "late"
 * rather than "wrong" when something breaks.
 *
 * Three invariants, all of which exist because getting them wrong mints money:
 *
 *  1. Only SETTLED credits count. A pending transfer can still reverse.
 *  2. `transaction_id` is the idempotency key, enforced by a unique column
 *     rather than a read-then-write, so two overlapping passes cannot both
 *     credit the same payment.
 *  3. We credit what we actually received (amount less provider fee), never the
 *     gross. Crediting more than landed creates naira nobody funded.
 */

/** Naira that arrived in an account we cannot attribute is held, never credited. */
export interface CollectionResult {
  scanned: number;
  credited: number;
  held: number;
  skipped: number;
}

function toNumber(v: number | string | null | undefined): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : (v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** An incoming, final, naira credit — the only shape we act on. */
function isIncomingNgn(t: BitnobTransaction): boolean {
  return (
    t.type === "DEPOSIT_CONFIRMED" &&
    t.state === "SETTLED" &&
    t.side?.toLowerCase() === "credit" &&
    t.currency === "NGN" &&
    Boolean(t.account_number)
  );
}

export async function pollCollections(): Promise<CollectionResult> {
  const result: CollectionResult = { scanned: 0, credited: 0, held: 0, skipped: 0 };
  if (!bitnobConfigured()) return result;

  const txs = (await listTransactions()).filter(isIncomingNgn);
  result.scanned = txs.length;
  if (txs.length === 0) return result;

  // One lookup for the whole batch rather than per transaction.
  const accounts = await prisma.ngnAccount.findMany({
    where: { accountNumber: { in: txs.map((t) => t.account_number as string) } },
    select: { accountNumber: true, userId: true },
  });
  const owner = new Map(accounts.map((a) => [a.accountNumber, a.userId]));

  for (const t of txs) {
    const accountNumber = t.account_number as string;
    const userId = owner.get(accountNumber);

    // Money in an account we don't recognise. Recording it against no user is
    // impossible, so it is left for an admin — the alternative is silently
    // ignoring someone's money.
    if (!userId) {
      result.held++;
      console.error(
        `[collections] unattributable NGN credit tx=${t.transaction_id} account=${accountNumber}`,
      );
      continue;
    }

    const gross = toNumber(t.amount);
    const fee = toNumber(t.fee);
    const net = quantize(gross - fee, 2);
    if (!(net > 0)) {
      result.skipped++;
      continue;
    }

    try {
      await withLedger(async (tx) => {
        // The unique constraint is the idempotency guard. A duplicate throws
        // here and the whole transaction rolls back, so a re-poll can never
        // credit twice even if two passes overlap.
        await tx.fiatDeposit.create({
          data: {
            userId,
            providerTxId: t.transaction_id,
            currency: "NGN",
            amount: gross,
            fee,
            status: "CREDITED",
            accountNumber,
            reference: t.reference,
            valueDate: t.value_date,
            creditedAt: new Date(),
          },
        });
        await credit(tx, userId, "NGN", net, {
          type: "DEPOSIT",
          refId: t.transaction_id,
          memo: `NGN collection ${accountNumber}`,
        });
      });

      result.credited++;
      await notify(userId, {
        type: "DEPOSIT",
        title: "Naira received",
        body: `₦${net.toLocaleString()} has been added to your balance.`,
        href: "/wallet",
      });
      await audit({
        actorId: userId,
        action: "collections:credited",
        targetType: "fiatDeposit",
        targetId: t.transaction_id,
        metadata: { gross, fee, net },
      });
    } catch (e) {
      // A unique violation is the expected steady state: almost every poll
      // re-reads payments already credited. Anything else is a real failure.
      if ((e as { code?: string }).code === "P2002") {
        result.skipped++;
      } else {
        result.held++;
        console.error(`[collections] failed tx=${t.transaction_id}: ${(e as Error).message}`);
      }
    }
  }

  return result;
}

/** Deposits an admin needs to resolve by hand. */
export async function listHeldDeposits() {
  const rows = await prisma.fiatDeposit.findMany({
    where: { status: { in: ["RECEIVED", "HELD"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    currency: r.currency,
    amount: Number(r.amount),
    status: r.status,
    holdReason: r.holdReason,
    accountNumber: r.accountNumber,
    createdAt: r.createdAt.getTime(),
  }));
}
