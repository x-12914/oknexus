import "server-only";
import crypto from "crypto";
import type { KycApplicant, KycLevel, KycProvider, KycSession, KycVerdict } from "./types";

// Didit hosted identity verification (KYC + AML). We create a session, send the user
// to the hosted flow, and receive the result via a signed webhook.
const SESSION_URL = process.env.DIDIT_SESSION_URL ?? "https://verification.didit.me/v1/session/";

export function diditConfigured(): boolean {
  return Boolean(process.env.DIDIT_API_KEY && process.env.DIDIT_WORKFLOW_ID);
}

function appUrl(): string {
  return (process.env.AUTH_URL ?? process.env.APP_URL ?? "https://oknexusexchange.com").replace(
    /\/$/,
    "",
  );
}

interface DiditSessionResponse {
  session_id?: string;
  id?: string;
  url?: string;
  session_url?: string;
  verification_url?: string;
}

/** Create a Didit verification session; returns the hosted URL + session id. */
export async function createDiditSession(
  vendorData: string,
): Promise<{ sessionId: string; url: string }> {
  const apiKey = process.env.DIDIT_API_KEY;
  const workflowId = process.env.DIDIT_WORKFLOW_ID;
  if (!apiKey || !workflowId) {
    throw new Error("Didit is not configured — set DIDIT_API_KEY + DIDIT_WORKFLOW_ID.");
  }

  const res = await fetch(SESSION_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      workflow_id: workflowId,
      vendor_data: vendorData,
      callback: `${appUrl()}/kyc?submitted=1`,
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Didit session failed: ${res.status} ${text.slice(0, 200)}`);
  let data: DiditSessionResponse;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Didit returned a non-JSON session response.");
  }
  const url = data.url ?? data.session_url ?? data.verification_url;
  const sessionId = data.session_id ?? data.id;
  if (!url || !sessionId) throw new Error("Didit session response missing url / session_id.");
  return { sessionId, url };
}

/**
 * Verify a Didit webhook: HMAC-SHA256(raw body, secret) == X-Signature, timestamp fresh.
 * Returns a reason on failure so the route can log *why* without exposing the secret/signature.
 */
export function verifyDiditWebhook(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): { ok: boolean; reason?: string } {
  const secret = process.env.DIDIT_WEBHOOK_SECRET;
  if (!secret) return { ok: false, reason: "no-secret-configured" };
  if (!signature) return { ok: false, reason: "missing-signature-header" };
  if (!timestamp) return { ok: false, reason: "missing-timestamp-header" };
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "non-numeric-timestamp" };
  const skew = Math.abs(Date.now() / 1000 - ts);
  if (skew > 300) return { ok: false, reason: `stale-timestamp (skew ${Math.round(skew)}s)` }; // replay guard
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "signature-mismatch" };
  }
  return { ok: true };
}

export class DiditKycProvider implements KycProvider {
  readonly id = "didit";

  async startVerification(applicant: KycApplicant, _level: KycLevel): Promise<KycSession> {
    const { sessionId, url } = await createDiditSession(applicant.userId);
    return { sessionId, url, expiresAt: new Date(Date.now() + 30 * 60 * 1000) };
  }

  async getStatus(_sessionId: string): Promise<KycVerdict> {
    // Status is delivered via webhook; this poll fallback stays pending.
    return "pending";
  }
}
