import type { NextRequest } from "next/server";
import { verifyDiditWebhook } from "@/lib/kyc/didit-provider";
import { applyDiditResult } from "@/lib/kyc";

// Didit posts verification results here. The signature (HMAC-SHA256 over the raw body)
// + a fresh timestamp authenticate that it genuinely came from Didit.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const verified = verifyDiditWebhook(
    raw,
    req.headers.get("x-signature"),
    req.headers.get("x-timestamp"),
  );
  if (!verified.ok) {
    console.warn(`[didit-webhook] rejected: ${verified.reason}`);
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let evt: { session_id?: string; status?: string; vendor_data?: string; decision?: unknown };
  try {
    evt = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  // Only status events carry a session_id + status; ack anything else.
  if (!evt.session_id || !evt.status) return Response.json({ ok: true });

  try {
    await applyDiditResult(evt.session_id, evt.vendor_data, evt.status, evt.decision);
    console.info(`[didit-webhook] ok session=${evt.session_id} status=${evt.status}`);
    return Response.json({ ok: true });
  } catch (e) {
    // 500 → Didit retries (up to 5x) so a transient DB blip recovers.
    console.error(`[didit-webhook] processing failed: ${(e as Error).message}`);
    return Response.json({ error: "processing failed" }, { status: 500 });
  }
}
