import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
// Generic AES-256-GCM helpers; they live in totp.ts because that was the first
// caller, not because they are TOTP-specific.
import { decryptSecret } from "@/lib/totp";
import { rateLimit } from "@/lib/rate-limit";
import { resolveApiKeyRow } from "@/lib/api-keys";

/**
 * Authenticating a programmatic request.
 *
 * Signed rather than bearer. A bearer token is replayable by anyone who ever
 * sees it — in a proxy log, an error report, a screenshot — and these keys reach
 * an account's money. Signing means the secret never crosses the wire, and a
 * captured request cannot be replayed outside its time window.
 *
 * The signature covers timestamp, method, path AND body, so none of them can be
 * altered in flight. Signing only the timestamp would let an attacker keep a
 * valid signature and swap the order it applies to.
 *
 *   X-OKN-KEY        the key, as issued
 *   X-OKN-TIMESTAMP  unix seconds
 *   X-OKN-SIGNATURE  hex HMAC-SHA256 of `${timestamp}${method}${path}${body}`
 */

/** How far a request's clock may drift before we reject it. */
const CLOCK_SKEW_SEC = 30;
/** Per key, per minute. Generous for a bot, cheap for us. */
const RATE_MAX = 120;

export type ApiAuthFailure = { ok: false; status: number; error: string };
export type ApiAuthSuccess = {
  ok: true;
  userId: string;
  keyId: string;
  canTrade: boolean;
  canWithdraw: boolean;
};
export type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure;

function fail(status: number, error: string): ApiAuthFailure {
  return { ok: false, status, error };
}

/**
 * Verify a signed request.
 *
 * `rawBody` must be the exact string the client signed. Re-serialising parsed
 * JSON would risk a byte difference — different key order, different number
 * formatting — that invalidates a legitimate signature.
 */
export async function authenticateApiRequest(
  req: NextRequest,
  rawBody = "",
): Promise<ApiAuthResult> {
  const presented = req.headers.get("x-okn-key");
  const timestamp = req.headers.get("x-okn-timestamp");
  const signature = req.headers.get("x-okn-signature");

  if (!presented || !timestamp || !signature) {
    return fail(401, "Missing X-OKN-KEY, X-OKN-TIMESTAMP or X-OKN-SIGNATURE.");
  }

  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return fail(401, "Invalid timestamp.");
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > CLOCK_SKEW_SEC) {
    return fail(401, "Request timestamp is outside the accepted window.");
  }

  // Rate limit on the presented key before touching the database, so an
  // attacker spraying guesses cannot use us to do their lookups.
  if (!rateLimit(`apikey:${presented.slice(0, 24)}`, { max: RATE_MAX, windowMs: 60_000 }).allowed) {
    return fail(429, "Rate limit exceeded.");
  }

  const row = await resolveApiKeyRow(presented);
  if (!row) return fail(401, "Invalid API key.");
  if (!row.secretEnc) {
    // Issued before signing existed. Refuse rather than fall back to treating
    // the key as a bearer token, which would silently downgrade every old key.
    return fail(401, "This key predates request signing. Please create a new one.");
  }

  const secret = decryptSecret(row.secretEnc);
  if (!secret) return fail(500, "Key could not be verified.");

  // The path only — a query string is part of the URL a client signs, so include
  // it exactly as sent rather than after any normalisation.
  const path = req.nextUrl.pathname + req.nextUrl.search;
  const expected = createHmac("sha256", secret)
    .update(`${ts}${req.method.toUpperCase()}${path}${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  // Length must match before timingSafeEqual, which throws on a mismatch, and
  // the comparison itself is constant-time so a wrong signature leaks nothing
  // about how much of it was right.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return fail(401, "Bad signature.");
  }

  return {
    ok: true,
    userId: row.userId,
    keyId: row.id,
    canTrade: row.canTrade,
    canWithdraw: row.canWithdraw,
  };
}

/** Standard error response for a failed authentication. */
export function apiAuthError(r: ApiAuthFailure): Response {
  return Response.json({ error: r.error }, { status: r.status });
}
