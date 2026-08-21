import "server-only";
import { bitnobRequest, bitnobConfigured, initializePayout, finalizePayout } from "@/lib/bitnob";
import type { PayoutBank, PayoutConfig, PayoutQuote } from "./types";

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
    quoteId: p.quote_id,
    payoutId: p.id,
    fromSymbol: p.from_asset ?? fromSymbol,
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

export interface ExecutePayoutInput {
  quoteId: string;
  bankCode: string;
  accountNumber: string;
}

/**
 * Commits a quote. MOVES REAL MONEY — both calls are behind the
 * BITNOB_ALLOW_LIVE_PAYOUTS gate in the client.
 */
export async function executePayout(input: ExecutePayoutInput): Promise<{ payoutId: string }> {
  const init = await initializePayout(input.quoteId, {
    country: COUNTRY,
    destination_type: "bank",
    bank_code: input.bankCode,
    account_number: input.accountNumber,
  });
  if (!init.ok) throw new Error(init.error ?? "Could not initialize the payout");

  const done = await finalizePayout(input.quoteId);
  if (!done.ok) throw new Error(done.error ?? "Could not finalize the payout");

  return { payoutId: input.quoteId };
}
