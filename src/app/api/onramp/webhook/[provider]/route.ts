import type { NextRequest } from "next/server";
import { handleOnrampWebhook } from "@/lib/onramp";

// Provider callbacks land here. The raw body is read once, before any parsing,
// because every provider's signature covers the exact bytes they sent.
export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const raw = await req.text();
  const path = new URL(req.url).pathname;
  try {
    const r = await handleOnrampWebhook(provider, raw, req.headers, path);
    return new Response(r.body, { status: r.status, headers: { "content-type": r.contentType } });
  } catch (e) {
    // 500 makes providers that retry do so; the ones that don't will be
    // reconciled by the deposit scanner regardless.
    console.error(`[onramp:${provider}] webhook processing failed: ${(e as Error).message}`);
    return new Response("processing failed", { status: 500 });
  }
}
