import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { startKycVerification } from "@/lib/kyc";
import { kycAutomated } from "@/lib/kyc/index";

const Body = z.object({ level: z.enum(["basic", "bvn", "full"]).default("full") });

// Begin a hosted identity verification and return the provider URL to redirect to.
export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  if (!kycAutomated()) {
    return Response.json({ error: "Hosted verification is not enabled." }, { status: 503 });
  }

  // The body is optional: a client that sends none gets the full route, which
  // is what a bare POST here has always meant.
  let level: "basic" | "bvn" | "full" = "full";
  const raw = await req.text();
  if (raw.trim()) {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }
    const parsed = Body.safeParse(json);
    if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
    level = parsed.data.level;
  }

  try {
    const { url } = await startKycVerification(userId, level);
    return Response.json({ url });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
