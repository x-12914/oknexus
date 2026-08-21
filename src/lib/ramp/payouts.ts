import "server-only";
import { LedgerType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withLedger, lock, unlock, settleLocked, quantize } from "@/lib/ledger";
import { notify } from "@/lib/notifications";
import { assertWithinDailyLimit } from "@/lib/custody/withdrawals";
import { fetchQuote, executePayout, getPayoutConfig, PayoutStepError } from "./bitnob-payout";
import { livePayoutsEnabled } from "@/lib/bitnob";
import type { FiatPayoutView } from "./types";

export type { FiatPayoutView };

/**
 * Fiat off-ramp settlement.
 *
 * Funds are LOCKED at request and only consumed once the provider has accepted
 * the payout, so a failure before hand-off returns the money without it ever
 * having left the account. Mirrors the on-chain withdrawal state machine.
 */


type PayoutRow = Prisma.FiatPayoutGetPayload<object>;

function maskAccount(n: string): string {
  return n.length <= 4 ? n : `${"•".repeat(n.length - 4)}${n.slice(-4)}`;
}

function toView(p: PayoutRow): FiatPayoutView {
  return {
    id: p.id,
    status: p.status,
    fromSymbol: p.fromSymbol,
    fromAmount: Number(p.fromAmount),
    fiatCode: p.fiatCode,
    fiatAmount: Number(p.fiatAmount),
    effectiveRate: Number(p.effectiveRate),
    feeFiat: Number(p.feeFiat),
    bankName: p.bankName,
    accountNumber: maskAccount(p.accountNumber),
    error: p.error,
    createdAt: p.createdAt.getTime(),
  };
}

export interface RequestPayoutInput {
  /** The provider's payout uuid from the quote. Amounts are re-read, not trusted. */
  payoutId: string;
  bankCode: string;
  accountNumber: string;
}

export async function requestPayout(
  userId: string,
  input: RequestPayoutInput,
): Promise<FiatPayoutView> {
  // Checked before anything is written or locked. The gate throws from inside
  // initializePayout, which would otherwise surface as an ambiguous send and
  // strand the funds LOCKED for a rejection that committed nothing.
  if (!livePayoutsEnabled()) {
    throw new Error("Payouts are currently disabled.");
  }

  const config = await getPayoutConfig();

  const bank = config.banks.find((b) => b.code === input.bankCode);
  if (!bank) throw new Error("Select a valid bank.");
  if (!new RegExp(config.fields.accountPattern).test(input.accountNumber)) {
    throw new Error("That account number isn't valid for this country.");
  }

  // Authoritative re-read. The client sends only an id, so it cannot inflate the
  // amount, change the asset, or replay a stale price.
  const quote = await fetchQuote(input.payoutId);
  if (quote.providerStatus !== "QUOTE") {
    throw new Error("That quote has already been used.");
  }
  if (quote.expiresAt <= Date.now()) {
    throw new Error("That quote has expired — request a new one.");
  }

  const amount = quantize(quote.fromAmount);
  if (!(amount > 0)) throw new Error("That quote has no payable amount.");

  // Enforced here rather than in the route: the payable amount is only known
  // once the quote has been re-read, and a client-supplied figure must never
  // be what the cap is checked against.
  await assertWithinDailyLimit(userId, quote.fromSymbol, amount);

  // Create + lock atomically. The unique constraint on providerPayoutId is what
  // actually stops a double-submitted quote: the second insert fails and rolls
  // back its lock, rather than reserving the funds twice.
  let row: PayoutRow;
  try {
    row = await withLedger(async (tx) => {
      const created = await tx.fiatPayout.create({
        data: {
          userId,
          providerQuoteId: quote.quoteId,
          providerPayoutId: quote.payoutId,
          fromSymbol: quote.fromSymbol,
          fromAmount: amount,
          fiatCode: quote.fiatCode,
          fiatAmount: quote.fiatAmount,
          effectiveRate: quote.effectiveRate,
          feeFiat: quote.feeFiat,
          country: config.country,
          bankCode: bank.code,
          bankName: bank.name,
          accountNumber: input.accountNumber,
          status: "REQUESTED",
        },
      });
      await lock(tx, userId, quote.fromSymbol, amount, {
        type: LedgerType.RAMP,
        refId: created.id,
        memo: `Payout ${quote.fiatCode} to ${bank.name}`,
      });
      return created;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("That quote has already been submitted.");
    }
    throw e;
  }

  // Claim before hand-off. Redundant while this runs inline, but it is the guard
  // that keeps a future retry or worker from paying the same row twice.
  const claim = await prisma.fiatPayout.updateMany({
    where: { id: row.id, status: "REQUESTED" },
    data: { status: "PROCESSING" },
  });
  if (claim.count === 0) {
    throw new Error("That payout is already being processed.");
  }

  try {
    await executePayout({
      payoutId: quote.payoutId,
      bankCode: bank.code,
      accountNumber: input.accountNumber,
    });
  } catch (e) {
    const message = String((e as Error).message).slice(0, 300);

    // A failed `initialize` committed nothing at the provider, so the money is
    // definitively still ours and refunding is safe.
    if (e instanceof PayoutStepError && e.step === "initialize") {
      await withLedger(async (tx) => {
        await unlock(tx, userId, quote.fromSymbol, amount, {
          type: LedgerType.RAMP,
          refId: row.id,
          memo: "Payout failed — refunded",
        });
        await tx.fiatPayout.update({
          where: { id: row.id },
          data: { status: "FAILED", error: message },
        });
      });
      await notify(userId, {
        type: "WITHDRAWAL",
        title: "Payout failed",
        body: `Your ${quote.fiatCode} payout could not be started. ${amount} ${quote.fromSymbol} was returned to your balance.`,
        href: "/withdraw",
      });
      throw new Error(message);
    }

    // A failed `finalize` is ambiguous — the provider may still have accepted it.
    // Refunding here risks paying the user twice, so leave the funds locked and
    // the row PROCESSING for manual reconciliation.
    await prisma.fiatPayout.update({
      where: { id: row.id },
      data: { error: message },
    });
    throw new Error(
      "We couldn't confirm this payout. It's under review and your funds stay reserved until it's resolved.",
    );
  }

  // Accepted: the locked funds have now genuinely left the account.
  const settled = await withLedger(async (tx) => {
    await settleLocked(tx, userId, quote.fromSymbol, amount, {
      type: LedgerType.RAMP,
      refId: row.id,
      memo: `Payout ${quote.fiatCode} to ${bank.name}`,
    });
    return tx.fiatPayout.update({
      where: { id: row.id },
      data: { status: "COMPLETED" },
    });
  });

  await notify(userId, {
    type: "WITHDRAWAL",
    title: "Payout sent",
    body: `${quote.fiatAmount.toLocaleString()} ${quote.fiatCode} is on its way to ${bank.name} ${maskAccount(input.accountNumber)}.`,
    href: "/withdraw",
  });

  return toView(settled);
}

export async function listPayouts(userId: string, take = 20): Promise<FiatPayoutView[]> {
  const rows = await prisma.fiatPayout.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map(toView);
}
