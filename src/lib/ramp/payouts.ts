import "server-only";
import { LedgerType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withLedger, lock, unlock, settleLocked, quantize } from "@/lib/ledger";
import { notify } from "@/lib/notifications";
import { assertWithinDailyLimit } from "@/lib/custody/withdrawals";
import {
  fetchQuote,
  executePayout,
  getPayoutConfig,
  fetchPayoutStatus,
  lookupAccount,
  PayoutStepError,
} from "./bitnob-payout";
import { livePayoutsEnabled, bitnobConfigured, getCompanyBalances } from "@/lib/bitnob";
import { payoutRequiresKyc } from "./flags";
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
    accountName: p.accountName,
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

/**
 * Which accounts may move real money.
 *
 * Set BITNOB_PAYOUT_ALLOWLIST to a comma-separated list of emails, or to "*"
 * to allow everyone once launch is genuinely intended.
 *
 * Unset or empty means NOBODY. This previously meant "everybody", which is the
 * wrong direction for a money control: clearing the variable during a config
 * edit would have silently opened payouts rather than closing them. Opening
 * them should take an explicit "*".
 */
export function payoutAllowedFor(email: string | null | undefined): boolean {
  const raw = process.env.BITNOB_PAYOUT_ALLOWLIST?.trim();
  if (!raw) return false;
  if (raw === "*") return true;
  const allowed = new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
  return Boolean(email && allowed.has(email.toLowerCase()));
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

  // Enforced here rather than only in the route, so every caller is covered.
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, kycStatus: true },
  });
  if (!payoutAllowedFor(actor?.email)) {
    throw new Error("Payouts aren't enabled for this account yet.");
  }

  // Sending fiat to a bank account without a verified identity is an AML
  // problem, not just a product gap. Nothing else in the app checked kycStatus,
  // so the whole verification flow gated nothing until this.
  if (payoutRequiresKyc() && actor?.kycStatus !== "APPROVED") {
    throw new Error("Verify your identity before withdrawing to a bank account.");
  }

  const config = await getPayoutConfig();

  const bank = config.banks.find((b) => b.code === input.bankCode);
  if (!bank) throw new Error("Select a valid bank.");
  if (!new RegExp(config.fields.accountPattern).test(input.accountNumber)) {
    throw new Error("That account number isn't valid for this country.");
  }

  // Resolve the holder server-side rather than accepting a name from the client.
  // This is also the last cheap chance to catch a mistyped account number: an
  // unresolvable account would fail at the provider anyway, but only after the
  // funds had been locked.
  const resolved = await lookupAccount(bank.code, input.accountNumber);

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

  // Create + lock atomically. The unique constraint on providerPayoutId is what
  // actually stops a double-submitted quote: the second insert fails and rolls
  // back its lock, rather than reserving the funds twice.
  let row: PayoutRow;
  try {
    row = await withLedger(async (tx) => {
      // Serialize per user for the rest of this transaction. Without it the cap
      // is checkable-then-beatable: two concurrent requests both read usage as
      // zero, both pass, and both lock. Being merely "inside a transaction" does
      // not help under READ COMMITTED — the lock is what orders them.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${userId})::bigint)`;

      // Checked here rather than in the route: the payable amount is only known
      // once the quote has been re-read, and a client-supplied figure must never
      // be what the cap is measured against.
      await assertWithinDailyLimit(userId, quote.fromSymbol, amount, tx);

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
          accountName: resolved.accountName,
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
    const providerId = await executePayout({
      // initialize/finalize take the QT2_ quote id; only GET takes the uuid.
      quoteId: quote.quoteId,
      bankCode: bank.code,
      accountNumber: input.accountNumber,
      accountName: resolved.accountName,
    });
    // Track whatever id the provider hands back, so the reconciler polls the
    // record the payout actually lives on rather than the one we quoted.
    if (providerId && providerId !== quote.payoutId) {
      await prisma.fiatPayout.update({
        where: { id: row.id },
        data: { providerPayoutId: providerId },
      });
    }
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

  // Accepted by the provider — but accepted is not arrived. A payout can still
  // fail downstream at the bank, so the funds stay LOCKED and the row stays
  // PROCESSING until reconcilePayouts sees a terminal status. Settling here
  // would leave no way to refund a payout that never actually landed.
  await notify(userId, {
    type: "WITHDRAWAL",
    title: "Payout submitted",
    body: `${quote.fiatAmount.toLocaleString()} ${quote.fiatCode} to ${bank.name} ${maskAccount(input.accountNumber)} is being processed.`,
    href: "/withdraw",
  });

  const submitted = await prisma.fiatPayout.findUniqueOrThrow({ where: { id: row.id } });
  return toView(submitted);
}

/**
 * Provider status vocabulary.
 *
 * Only statuses in these sets are acted on. Anything unrecognised is recorded
 * and otherwise left completely alone, because guessing wrong in either
 * direction is expensive: treat a live payout as failed and we refund money
 * that already went out; treat a failed one as settled and the user silently
 * loses their balance. The real strings land after the first live payout.
 */
const TERMINAL_SUCCESS = new Set([
  "SUCCESS",
  "SUCCESSFUL",
  "COMPLETED",
  "COMPLETE",
  "PAID",
  "SETTLED",
]);
const TERMINAL_FAILURE = new Set([
  "FAILED",
  "FAILURE",
  "EXPIRED",
  "REJECTED",
  "CANCELLED",
  "CANCELED",
  "REVERSED",
  "REFUNDED",
]);
const IN_FLIGHT = new Set([
  "QUOTE",
  "INITIATED",
  "INITIALIZED",
  "PENDING",
  "PROCESSING",
  "QUEUED",
]);

export interface ReconcileResult {
  checked: number;
  completed: number;
  failed: number;
  /** Unrecognised provider statuses, surfaced so the map can be tightened. */
  unknown: string[];
}

/**
 * Poll in-flight payouts and drive them to a terminal state.
 *
 * This is the only place a payout is settled or refunded after hand-off. It is
 * idempotent — each transition is claimed with a guarded update inside the same
 * transaction as the ledger move — so running it alongside a webhook, or twice
 * concurrently, cannot double-settle or double-refund.
 */
export async function reconcilePayouts(take = 25): Promise<ReconcileResult> {
  const result: ReconcileResult = { checked: 0, completed: 0, failed: 0, unknown: [] };
  if (!bitnobConfigured()) return result;

  const rows = await prisma.fiatPayout.findMany({
    where: { status: "PROCESSING", providerPayoutId: { not: null } },
    orderBy: { createdAt: "asc" },
    take,
  });

  for (const row of rows) {
    const providerId = row.providerPayoutId;
    if (!providerId) continue;
    result.checked++;

    let status: string;
    try {
      status = await fetchPayoutStatus(providerId);
    } catch {
      // Transient provider/network failure. Never act on no information —
      // the next pass retries.
      continue;
    }

    const norm = status.trim().toUpperCase();
    const amount = Number(row.fromAmount);
    const ref = {
      type: LedgerType.RAMP,
      refId: row.id,
      memo: `Payout ${row.fiatCode} to ${row.bankName}`,
    };

    if (TERMINAL_SUCCESS.has(norm)) {
      const moved = await withLedger(async (tx) => {
        const claim = await tx.fiatPayout.updateMany({
          where: { id: row.id, status: "PROCESSING" },
          data: { status: "COMPLETED", providerStatus: status },
        });
        if (claim.count === 0) return false; // another pass already handled it
        await settleLocked(tx, row.userId, row.fromSymbol, amount, ref);
        return true;
      });
      if (moved) {
        result.completed++;
        await notify(row.userId, {
          type: "WITHDRAWAL",
          title: "Payout completed",
          body: `${Number(row.fiatAmount).toLocaleString()} ${row.fiatCode} has arrived at ${row.bankName} ${maskAccount(row.accountNumber)}.`,
          href: "/withdraw",
        });
      }
    } else if (TERMINAL_FAILURE.has(norm)) {
      const moved = await withLedger(async (tx) => {
        const claim = await tx.fiatPayout.updateMany({
          where: { id: row.id, status: "PROCESSING" },
          data: { status: "FAILED", providerStatus: status, error: `Provider reported ${status}` },
        });
        if (claim.count === 0) return false;
        // Never settled, so the reserved funds simply go back.
        await unlock(tx, row.userId, row.fromSymbol, amount, {
          ...ref,
          memo: "Payout failed — refunded",
        });
        return true;
      });
      if (moved) {
        result.failed++;
        await notify(row.userId, {
          type: "WITHDRAWAL",
          title: "Payout failed",
          body: `Your ${row.fiatCode} payout could not be completed. ${amount} ${row.fromSymbol} is back in your balance.`,
          href: "/withdraw",
        });
      }
    } else {
      await prisma.fiatPayout.update({
        where: { id: row.id },
        data: { providerStatus: status },
      });
      if (!IN_FLIGHT.has(norm)) result.unknown.push(status);
    }
  }

  return result;
}

export async function listPayouts(userId: string, take = 20): Promise<FiatPayoutView[]> {
  const rows = await prisma.fiatPayout.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map(toView);
}


/**
 * Provider float monitoring.
 *
 * Running dry is not catastrophic — a payout that can't be funded fails at
 * initialize and refunds — but it turns every withdrawal into a failure with no
 * warning, so it is worth knowing before users find out.
 */
const FLOAT_MIN = Number(process.env.BITNOB_FLOAT_MIN ?? 5);
const WARN_EVERY_MS = 6 * 3600 * 1000;
/** In-process, so a restart re-arms the warning. Acceptable for a single worker. */
let lastFloatWarnAt = 0;

export interface FloatAccount {
  symbol: string;
  available: number;
  low: boolean;
}

/** Parse "19.63775 USDT" — the raw field is in base units that differ per asset. */
function parseFormatted(formatted: string | undefined, raw: string | undefined): number {
  const fromFormatted = Number.parseFloat(String(formatted ?? "").trim());
  if (Number.isFinite(fromFormatted)) return fromFormatted;
  const fromRaw = Number(raw);
  return Number.isFinite(fromRaw) ? fromRaw : 0;
}

export async function checkPayoutFloat(now = Date.now()): Promise<FloatAccount[]> {
  if (!bitnobConfigured()) return [];
  const accounts = await getCompanyBalances();

  const result: FloatAccount[] = accounts
    .filter((a) => a.currency === "USDT" || a.currency === "USDC")
    .map((a) => {
      const available = parseFormatted(a.available_balance_formatted, a.available_balance);
      return { symbol: a.currency, available, low: available < FLOAT_MIN };
    });

  // Payouts draw from whichever stablecoin is funded, so only warn when the
  // combined balance is short — one empty account is normal.
  const total = result.reduce((sum, a) => sum + a.available, 0);
  if (total < FLOAT_MIN && now - lastFloatWarnAt > WARN_EVERY_MS) {
    lastFloatWarnAt = now;
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    for (const a of admins) {
      await notify(a.id, {
        type: "SYSTEM",
        title: "Payout float is low",
        body: `Only ${total.toFixed(2)} left at the payout provider. Bank withdrawals will start failing once it runs out.`,
        href: "/admin",
      });
    }
  }
  return result;
}
