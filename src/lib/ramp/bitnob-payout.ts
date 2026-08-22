import "server-only";
import { bitnobRequest, bitnobConfigured, initializePayout, finalizePayout } from "@/lib/bitnob";
import type { PayoutBank, PayoutConfig, PayoutQuote, ResolvedAccount } from "./types";

/**
 * NGN off-ramp over Bitnob payouts.
 *
 * The country-requirements endpoint returns the bank list, the beneficiary field
 * spec and the limits in one response, so a single cached call drives the whole
 * form instead of hardcoding 358 bank codes that go stale.
 */
const COUNTRY = "NG";
const FIAT = "NGN";
/** Assets we hold float in at the provider. USDT quotes ~0.1% better than USDC. */
const FROM_SYMBOLS = ["USDT", "USDC"];

const CONFIG_TTL_MS = 60 * 60 * 1000; // banks/limits change rarely
let configCache: { at: number; value: PayoutConfig } | null = null;

interface RawField {
  key?: string;
  label?: string;
  pattern?: string;
  placeholder?: string;
}
interface RawBank {
  name?: string;
  code?: string;
}
interface RawCountry {
  data?: {
    destination_types?: {
      bank?: {
        fields?: RawField[];
        banks?: RawBank[];
        limits?: { min_amount?: string; max_amount?: string; currency?: string };
      };
    };
  };
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function payoutConfigured(): boolean {
  return bitnobConfigured();
}

export async function getPayoutConfig(): Promise<PayoutConfig> {
  const now = Date.now();
  if (configCache && now - configCache.at < CONFIG_TTL_MS) return configCache.value;

  const res = await bitnobRequest<RawCountry>("GET", `/api/payouts/supported-countries/${COUNTRY}`);
  if (!res.ok) throw new Error(res.error ?? "Could not load payout configuration");

  const bank = res.data?.data?.destination_types?.bank;
  const account = bank?.fields?.find((f) => f.key === "account_number");
  const banks: PayoutBank[] = (bank?.banks ?? [])
    .filter((b): b is Required<RawBank> => Boolean(b.code && b.name))
    .map((b) => ({ code: b.code, name: b.name.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!banks.length) throw new Error("Payout provider returned no banks");

  const value: PayoutConfig = {
    country: COUNTRY,
    fiatCode: bank?.limits?.currency ?? FIAT,
    minFiat: num(bank?.limits?.min_amount, 500),
    maxFiat: num(bank?.limits?.max_amount, 500_000_000),
    fromSymbols: FROM_SYMBOLS,
    banks,
    fields: {
      // Fall back to the documented NG rule if the provider ever omits it, so
      // the form never silently accepts anything.
      accountPattern: account?.pattern ?? "^\d{10}$",
      accountLabel: account?.label ?? "Account Number",
      accountPlaceholder: account?.placeholder ?? "e.g. 0123456789",
    },
  };
  configCache = { at: now, value };
  return value;
}

interface RawQuote {
  data?: {
    payout?: {
      id?: string;
      quote_id?: string;
      from_asset?: string;
      to_currency?: string;
      amount?: string;
      settlement_amount?: string;
      expires_at?: string;
      status?: string;
      exchange_rate?: { rate?: string; effective_rate?: string };
    };
  };
}

export interface QuotePayoutInput {
  fromSymbol: string;
  /** Supply exactly one side; the provider computes the other. */
  fromAmount?: number;
  fiatAmount?: number;
}

export async function quotePayout(input: QuotePayoutInput): Promise<PayoutQuote> {
  const { fromSymbol } = input;
  if (!FROM_SYMBOLS.includes(fromSymbol)) {
    throw new Error(`Unsupported payout asset: ${fromSymbol}`);
  }
  const hasFrom = typeof input.fromAmount === "number";
  const hasFiat = typeof input.fiatAmount === "number";
  if (hasFrom === hasFiat) {
    throw new Error("Specify exactly one of fromAmount or fiatAmount");
  }

  const body: Record<string, string> = {
    country: COUNTRY,
    to_currency: FIAT,
    from_asset: fromSymbol,
    source: "offchain", // debit our provider float rather than an on-chain send
  };
  // Amounts must be strings — a numeric value is rejected as an invalid body.
  if (hasFrom) body.amount = String(input.fromAmount);
  else body.settlement_amount = String(input.fiatAmount);

  const res = await bitnobRequest<RawQuote>("POST", "/api/payouts/quotes", body);
  if (!res.ok) throw new Error(res.error ?? "Could not price this payout");

  const p = res.data?.data?.payout;
  if (!p?.quote_id || !p.id) throw new Error("Payout provider returned an unusable quote");
  return normalizeQuote(p);
}

type RawPayout = NonNullable<NonNullable<RawQuote["data"]>["payout"]>;

function normalizeQuote(p: RawPayout): PayoutQuote {
  const fromAmount = num(p.amount);
  const fiatAmount = num(p.settlement_amount);
  const marketRate = num(p.exchange_rate?.rate);
  const effectiveRate = num(p.exchange_rate?.effective_rate);

  // The provider always reports fees: 0 and takes its cut in the rate instead.
  // Surfacing its fee field would tell users this is free, so derive the cost:
  // what mid-market would have paid, minus what they actually receive.
  const spreadPct = marketRate > 0 ? ((marketRate - effectiveRate) / marketRate) * 100 : 0;
  const feeFiat = marketRate > 0 ? Math.max(0, fromAmount * marketRate - fiatAmount) : 0;

  return {
    quoteId: p.quote_id ?? "",
    payoutId: p.id ?? "",
    fromSymbol: p.from_asset ?? "",
    fromAmount,
    fiatCode: p.to_currency ?? FIAT,
    fiatAmount,
    marketRate,
    effectiveRate,
    spreadPct,
    feeFiat,
    expiresAt: p.expires_at ? Date.parse(p.expires_at) : Date.now() + 15 * 60_000,
  };
}

/** A quote re-read from the provider, plus the lifecycle status it reports. */
export interface FetchedQuote extends PayoutQuote {
  /** "QUOTE" while still unspent; anything else means it was already used. */
  providerStatus: string;
}

/**
 * Re-read a quote from the provider by its uuid. The client only ever sends us
 * an id, never amounts — this is the authoritative source for what gets locked,
 * so a tampered request can't inflate the payout.
 *
 * Note the provider's `quote_id` ("QT2_…") is NOT accepted here; this route
 * takes the uuid and 400s on anything else.
 */
export async function fetchQuote(payoutId: string): Promise<FetchedQuote> {
  const res = await bitnobRequest<RawQuote>("GET", `/api/payouts/${encodeURIComponent(payoutId)}`);
  if (!res.ok) throw new Error(res.error ?? "Could not find that quote");
  const p = res.data?.data?.payout;
  if (!p?.quote_id || !p.id) throw new Error("Payout provider returned an unusable quote");
  return { ...normalizeQuote(p), providerStatus: String(p.status ?? "") };
}

/**
 * The provider's current status string for a payout, verbatim.
 *
 * Deliberately not mapped here: the reconciler owns the interpretation, and
 * keeping the raw value means an unexpected string is visible rather than
 * silently coerced into "succeeded" or "failed".
 */
export async function fetchPayoutStatus(payoutId: string): Promise<string> {
  const res = await bitnobRequest<RawQuote>("GET", `/api/payouts/${encodeURIComponent(payoutId)}`);
  if (!res.ok) throw new Error(res.error ?? "Could not read payout status");
  const status = res.data?.data?.payout?.status;
  if (!status) throw new Error("Provider returned no status");
  return String(status);
}

interface RawLookup {
  data?: {
    account_name?: string;
    account_number?: string;
    bank_code?: string;
    is_verified?: boolean;
  };
}

/**
 * Resolve a bank account to its registered holder.
 *
 * The provider is fussy about this one: only the exact query set
 * country + destination_type + bank_code + account_number is accepted —
 * dropping country, or using camelCase keys, returns "Validation failed".
 */
export async function lookupAccount(
  bankCode: string,
  accountNumber: string,
): Promise<ResolvedAccount> {
  const qs = new URLSearchParams({
    country: COUNTRY,
    destination_type: "bank",
    bank_code: bankCode,
    account_number: accountNumber,
  });
  const res = await bitnobRequest<RawLookup>("GET", `/api/payouts/account-lookup?${qs.toString()}`);
  if (!res.ok) throw new Error(res.error ?? "Could not verify that account.");
  const d = res.data?.data;
  if (!d?.account_name) throw new Error("Could not verify that account.");
  return {
    accountName: d.account_name,
    accountNumber: d.account_number ?? accountNumber,
    bankCode: d.bank_code ?? bankCode,
    verified: Boolean(d.is_verified),
  };
}

/** Which leg of the two-step commit failed — decides refund vs. reconcile. */
export class PayoutStepError extends Error {
  constructor(
    public step: "initialize" | "finalize",
    message: string,
  ) {
    super(message);
    this.name = "PayoutStepError";
  }
}

export interface ExecutePayoutInput {
  /** The provider's payout uuid, not the "QT2_…" quote id. */
  payoutId: string;
  bankCode: string;
  accountNumber: string;
}

/**
 * Commits a quote. MOVES REAL MONEY — both calls sit behind the
 * BITNOB_ALLOW_LIVE_PAYOUTS gate in the client.
 *
 * The two legs fail very differently: a failed `initialize` has committed
 * nothing and is safe to refund, whereas a failed `finalize` may or may not
 * have been accepted, so the caller must reconcile it rather than refund.
 */
export async function executePayout(input: ExecutePayoutInput): Promise<void> {
  const init = await initializePayout(input.payoutId, {
    country: COUNTRY,
    destination_type: "bank",
    bank_code: input.bankCode,
    account_number: input.accountNumber,
  });
  if (!init.ok) {
    throw new PayoutStepError("initialize", init.error ?? "Could not initialize the payout");
  }

  const done = await finalizePayout(input.payoutId);
  if (!done.ok) {
    throw new PayoutStepError("finalize", done.error ?? "Could not finalize the payout");
  }
}
