import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { bitnobConfigured } from "@/lib/bitnob";
import { getNgnAccount, provisionNgnAccount, ProvisionError } from "@/lib/ramp/ngn-accounts";

/** The user's dedicated naira account, if they have one yet. */
export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in to continue." }, { status: 401 });
  return Response.json({ account: await getNgnAccount(userId), available: bitnobConfigured() });
}

// Deliberately loose on names: legal names contain apostrophes, hyphens and
// accents, and rejecting them would lock real people out of depositing.
const ProvisionSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: z.string().trim().min(10).max(20),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bvn: z.string().trim().regex(/^\d{11}$/),
});

/**
 * Open a naira account.
 *
 * The BVN in this request body is forwarded to the payment provider and never
 * written to our database or our logs. Errors here are returned as-is from the
 * provider only when they are safe to show; the body is never echoed back.
 */
export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in to continue." }, { status: 401 });

  // Opening an account is a per-user, once-ever action that costs a third-party
  // call. A tight limit also blunts using this endpoint to probe BVNs.
  if (!rateLimit(`ngn-provision:${userId}`, { max: 5, windowMs: 60 * 60_000 }).allowed) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const parsed = ProvisionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Please check your details and try again." },
      { status: 400 },
    );
  }

  try {
    return Response.json({ account: await provisionNgnAccount(userId, parsed.data) });
  } catch (e) {
    if (e instanceof ProvisionError) {
      return Response.json({ error: e.message }, { status: 400 });
    }
    // Never surface a raw provider error: it can quote the request back, and the
    // request contains a BVN.
    console.error(`[ngn-provision] failed for user ${userId}`);
    return Response.json({ error: "Couldn't open your naira account." }, { status: 500 });
  }
}
