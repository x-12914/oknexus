import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createOnrampSession } from "@/lib/onramp";

const Body = z.object({
  provider: z.string().min(2).max(32),
  fiatCode: z.string().length(3),
  fiatAmount: z.number().positive().max(1_000_000_000).optional(),
  cryptoSymbol: z.string().min(2).max(12),
});

/** Start a purchase: creates our order row and returns the provider's hosted checkout URL. */
export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  // Each call mints a provider order; a loop of them is abuse, not shopping.
  if (!rateLimit(`onramp-session:${userId}`, { max: 10, windowMs: 60 * 60_000 }).allowed) {
    return Response.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  try {
    const { provider, ...rest } = parsed.data;
    return Response.json(await createOnrampSession(userId, provider, rest));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
