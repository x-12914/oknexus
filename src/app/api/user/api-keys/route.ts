import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  apiKeysEnabled,
  ApiKeyError,
} from "@/lib/api-keys";

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ keys: [], available: false });
  // Revoking stays available even when issuing is off, so anyone holding an
  // older key can still retire it.
  return Response.json({ keys: await listApiKeys(userId), available: apiKeysEnabled() });
}

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    label: z.string().max(60).optional(),
    canTrade: z.boolean().optional(),
  }),
  z.object({ action: z.literal("revoke"), id: z.string().min(3) }),
]);

export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  if (!rateLimit(`apikeys:${userId}`, { max: 20, windowMs: 600_000 }).allowed) {
    return Response.json({ error: "Too many changes. Try again later." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const d = parsed.data;

  try {
    if (d.action === "create") {
      // The key and its signing secret are in this response and nowhere else,
      // ever again. The secret is encrypted at rest and never re-served.
      const { key, secret, view } = await createApiKey(userId, d.label ?? "API key", {
        canTrade: d.canTrade,
      });
      return Response.json({ key, secret, view });
    }
    await revokeApiKey(userId, d.id);
    return Response.json({ ok: true });
  } catch (e) {
    const status = e instanceof ApiKeyError ? 400 : 500;
    return Response.json({ error: (e as Error).message }, { status });
  }
}
