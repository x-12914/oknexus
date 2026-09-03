import "server-only";
import crypto from "crypto";
import type { KycApplicant, KycLevel, KycProvider, KycSession, KycVerdict } from "./types";

// Didit hosted identity verification. We create a session, send the user to the
// hosted flow, and receive the result via a signed webhook.
//
// Two workflows, chosen per session:
//   DIDIT_WORKFLOW_ID        full: document + selfie + AML. Unlocks fiat.
//   DIDIT_BASIC_WORKFLOW_ID  basic: a questionnaire (name + NIN) followed by a
//                            Database Validation step against Nigeria's NIMC
//                            register. No document, no camera. Crypto only.
// The steps live in Didit's console; this code only picks which workflow runs.
// The basic route is optional and is offered only when its id is set.
//
// v2, NOT v1: the v1 endpoint silently ignores `workflow_id` and falls back to the
// account's default workflow. It accepts a fabricated uuid with a 201, so there is no
// error to notice. We were unknowingly running every verification through the free
// document-only workflow instead of the KYC + AML one this app is configured for.
// v2 validates the id ("Invalid workflow_id.") and returns the same session_id/url
// fields, so nothing downstream changes.
const SESSION_URL = process.env.DIDIT_SESSION_URL ?? "https://verification.didit.me/v2/session/";

export function diditConfigured(): boolean {
  return Boolean(process.env.DIDIT_API_KEY && process.env.DIDIT_WORKFLOW_ID);
}

/**
 * The basic (register-only) route needs the full one configured as well: they
 * share the API key and the webhook, and basic is an addition, not a substitute.
 */
export function diditBasicConfigured(): boolean {
  return diditConfigured() && Boolean(process.env.DIDIT_BASIC_WORKFLOW_ID);
}

function workflowIdFor(level: KycLevel): string | undefined {
  return level === "basic" ? process.env.DIDIT_BASIC_WORKFLOW_ID : process.env.DIDIT_WORKFLOW_ID;
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

/** Create a Didit verification session on the given workflow; returns the hosted URL + session id. */
export async function createDiditSession(
  vendorData: string,
  workflowId: string | undefined = process.env.DIDIT_WORKFLOW_ID,
): Promise<{ sessionId: string; url: string }> {
  const apiKey = process.env.DIDIT_API_KEY;
  if (!apiKey || !workflowId) {
    throw new Error("Didit is not configured: set DIDIT_API_KEY + DIDIT_WORKFLOW_ID.");
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

  async startVerification(applicant: KycApplicant, level: KycLevel): Promise<KycSession> {
    const workflowId = workflowIdFor(level);
    if (!workflowId) {
      throw new Error(
        level === "basic"
          ? "Quick verification is not enabled: set DIDIT_BASIC_WORKFLOW_ID."
          : "Didit is not configured: set DIDIT_API_KEY + DIDIT_WORKFLOW_ID.",
      );
    }
    const { sessionId, url } = await createDiditSession(applicant.userId, workflowId);
    return { sessionId, url, expiresAt: new Date(Date.now() + 30 * 60 * 1000) };
  }

  async getStatus(_sessionId: string): Promise<KycVerdict> {
    // Status is delivered via webhook; this poll fallback stays pending.
    return "pending";
  }
}
