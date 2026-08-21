import "server-only";
import { createHmac, randomBytes } from "node:crypto";

/**
 * Bitnob client (server-only) — fiat on/off-ramp for NGN & Africa.
 *
 * Auth is HMAC-SHA256 request signing, NOT a bearer token. The older
 * `Authorization: Bearer <key>` contract against `api.bitnob.co/api/v1` is gone;
 * everything now goes to `api.bitnob.com` with four signed headers.
 *
 * Sandbox and production share ONE base URL and ONE client id — only the secret
 * key differs (`sk_test_…` vs `sk_live_…`). So "going live" is a key swap, not a
 * URL swap, which is why there is no BITNOB_ENV here any more.
 *
 * Env:
 *   BITNOB_CLIENT_ID  — same value in sandbox and production
 *   BITNOB_SECRET_KEY — colon-prefixed, e.g. `prd:live:…` (falls back to the
 *                       legacy BITNOB_API_KEY name so an existing .env works)
 *   BITNOB_API_BASE   — optional override (default https://api.bitnob.com)
 */
const DEFAULT_BASE = "https://api.bitnob.com";

function clientId(): string | undefined {
  return process.env.BITNOB_CLIENT_ID;
}

function secretKey(): string | undefined {
  return process.env.BITNOB_SECRET_KEY ?? process.env.BITNOB_API_KEY;
}

export function bitnobBase(): string {
  return (process.env.BITNOB_API_BASE ?? DEFAULT_BASE).replace(/\/$/, "");
}

export function bitnobConfigured(): boolean {
  return Boolean(clientId() && secretKey());
}

/**
 * Which credential set is loaded, sniffed from the key's colon-prefixed header
 * (e.g. `prd:live:…`). A HINT ONLY — treat it as a guard rail, not proof; the
 * authoritative answer is whatever /api/whoami reports for the account.
 *
 * Test markers deliberately beat live markers: reading a live key as sandbox
 * only refuses a real payout, while reading a sandbox key as live would report
 * money moved that never actually did.
 */
export function bitnobMode(): "live" | "sandbox" | "unknown" {
  const key = (secretKey() ?? "").toLowerCase();
  if (!key) return "unknown";
  // Only the prefix carries the environment. The random tail is base62 and
  // could contain "live" by chance, so never scan the whole key.
  const cut = key.lastIndexOf(":");
  const prefix = cut > 0 ? key.slice(0, cut) : key.slice(0, 12);
  if (/(^|:)(test|sandbox|sbx|dev|stg)(:|$)/.test(prefix)) return "sandbox";
  if (/(^|:)(live|prd|prod)(:|$)/.test(prefix)) return "live";
  return "unknown";
}

/**
 * Sign one request. The signature covers CLIENT_ID:TIMESTAMP:NONCE:PAYLOAD,
 * where PAYLOAD is the exact request body string ("" when there is no body).
 * Timestamps are checked against roughly a +/-5 minute window, so a VPS with
 * drifting clock will fail auth — keep NTP running.
 */
function authHeaders(payload: string): Record<string, string> {
  const id = clientId();
  const secret = secretKey();
  if (!id || !secret) {
    throw new Error("Bitnob is not configured — set BITNOB_CLIENT_ID and BITNOB_SECRET_KEY.");
  }
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", secret)
    .update(`${id}:${timestamp}:${nonce}:${payload}`)
    .digest("hex");
  return {
    "X-Auth-Client": id,
    "X-Auth-Timestamp": timestamp,
    "X-Auth-Nonce": nonce,
    "X-Auth-Signature": signature,
  };
}

export interface BitnobResponse<T> {
  status: number;
  ok: boolean;
  data: T | null;
  /** Error message lifted out of Bitnob's envelope, when the call failed. */
  error: string | null;
}

/** Low-level signed request. Returns status + parsed JSON; never throws on non-2xx. */
export async function bitnobRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<BitnobResponse<T>> {
  // Serialize once and both hash and send THIS string. Re-serializing for the
  // send would risk a byte difference that invalidates the signature.
  const payload = body === undefined ? "" : JSON.stringify(body);
  const res = await fetch(`${bitnobBase()}${path}`, {
    method,
    headers: {
      ...authHeaders(payload),
      ...(payload ? { "content-type": "application/json" } : {}),
      accept: "application/json",
    },
    body: payload || undefined,
    cache: "no-store",
  });
  let data: T | null = null;
  let raw: string | null = null;
  try {
    raw = await res.text();
    data = raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // non-JSON response — keep `raw` for the error message below
  }
  let error: string | null = null;
  if (!res.ok) {
    const envelope = data as { message?: string; error?: string } | null;
    error = envelope?.message ?? envelope?.error ?? raw?.slice(0, 200) ?? `HTTP ${res.status}`;
  }
  return { status: res.status, ok: res.ok, data, error };
}

/** Credential smoke test — cheapest call that proves the signature is accepted. */
export async function bitnobWhoami(): Promise<BitnobResponse<unknown>> {
  return bitnobRequest("GET", "/api/whoami");
}

// ---- Payouts (off-ramp: crypto balance -> local bank / mobile money) ----
//
// Path shape is `/api/<resource>` with NO version segment; the old
// `/api/v1/...` routes are gone. Request bodies are snake_case.
//
// SAFETY: Bitnob has no separate sandbox host — live and test credentials hit
// the same base URL. So "are we pointed at production?" cannot be answered by
// the URL, and a mistake here spends real money. initializePayout/finalizePayout
// are therefore gated behind BITNOB_ALLOW_LIVE_PAYOUTS and fail closed.

export interface BitnobCorridor {
  currency: string; // "NGN"
  destination_types: string[]; // ["bank"] | ["mobile_money"] | ["swift"] …
}

export interface BitnobCountry {
  code: string; // ISO-2, "NG"
  name: string;
  flag: string;
  dial_code: string;
  corridors: BitnobCorridor[];
}

export interface BitnobBank {
  bank_name: string;
  bank_code: string;
}

export interface BitnobBalanceAccount {
  account_id: string;
  account_number: string;
  currency: string; // BTC | USDC | USDT — note: NO fiat account unless enabled
  ledger_balance: string;
  available_balance: string;
  ledger_balance_formatted?: string;
  available_balance_formatted?: string;
}

/** Countries we can pay out to, with the rails each supports. */
export async function listPayoutCountries(): Promise<BitnobCountry[]> {
  const r = await bitnobRequest<{ data?: { countries?: BitnobCountry[] } }>(
    "GET",
    "/api/payouts/supported-countries",
  );
  return r.data?.data?.countries ?? [];
}

/** Per-country destination types and the exact beneficiary fields each requires. */
export async function getPayoutCountry(code: string): Promise<unknown> {
  const r = await bitnobRequest("GET", `/api/payouts/supported-countries/${encodeURIComponent(code)}`);
  return r.data;
}

/** Bank list for a country — `bank_code` is what a payout beneficiary needs. */
export async function listPayoutBanks(countryCode: string): Promise<BitnobBank[]> {
  const r = await bitnobRequest<{ data?: { banks?: BitnobBank[] } }>(
    "GET",
    `/api/payouts/banks/${encodeURIComponent(countryCode)}`,
  );
  return r.data?.data?.banks ?? [];
}

/** Our own float at Bitnob. Payouts draw from this, so zero here = nothing ships. */
export async function getCompanyBalances(): Promise<BitnobBalanceAccount[]> {
  const r = await bitnobRequest<{ data?: { accounts?: BitnobBalanceAccount[] } }>("GET", "/api/balances");
  return r.data?.data?.accounts ?? [];
}

export interface PayoutQuoteInput {
  country: string; // ISO-2, must be in listPayoutCountries()
  to_currency: string; // "NGN"
  from_asset: string; // "USDT" — letters only
  source: "offchain" | "onchain"; // offchain = debit our Bitnob balance
  /** Supply exactly one of these three. */
  amount?: string;
  amount_in_base_units?: string;
  settlement_amount?: string;
}

/**
 * Step 1 of 3. Locks a rate (~15 min). Creating a quote alone moves no money —
 * only initialize + finalize do.
 */
export async function createPayoutQuote(input: PayoutQuoteInput): Promise<BitnobResponse<unknown>> {
  if (!input.amount && !input.amount_in_base_units && !input.settlement_amount) {
    throw new Error("Provide one of amount, amount_in_base_units, or settlement_amount.");
  }
  return bitnobRequest("POST", "/api/payouts/quotes", input);
}

/**
 * Refuse to move money unless someone deliberately turned it on. Without this a
 * stray call in a dev branch would debit the real float, because there is no
 * sandbox URL to accidentally be pointed at instead.
 */
function assertLivePayoutsAllowed(step: string): void {
  if (process.env.BITNOB_ALLOW_LIVE_PAYOUTS !== "true") {
    throw new Error(
      `Refusing to ${step}: set BITNOB_ALLOW_LIVE_PAYOUTS=true to permit real payouts (mode=${bitnobMode()}).`,
    );
  }
}

/** Step 2 of 3 — attaches the beneficiary. MOVES REAL MONEY once finalized. */
export async function initializePayout(
  quoteId: string,
  body: Record<string, unknown>,
): Promise<BitnobResponse<unknown>> {
  assertLivePayoutsAllowed("initialize a payout");
  return bitnobRequest("POST", `/api/payouts/${encodeURIComponent(quoteId)}/initialize`, body);
}

/** Step 3 of 3 — commits the transfer. MOVES REAL MONEY. */
export async function finalizePayout(
  quoteId: string,
  body: Record<string, unknown> = {},
): Promise<BitnobResponse<unknown>> {
  assertLivePayoutsAllowed("finalize a payout");
  return bitnobRequest("POST", `/api/payouts/${encodeURIComponent(quoteId)}/finalize`, body);
}

export async function getPayout(id: string): Promise<BitnobResponse<unknown>> {
  return bitnobRequest("GET", `/api/payouts/${encodeURIComponent(id)}`);
}

export async function listPayouts(): Promise<BitnobResponse<unknown>> {
  return bitnobRequest("GET", "/api/payouts");
}
