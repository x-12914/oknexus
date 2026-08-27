import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { notify } from "@/lib/notifications";

/**
 * Anti-phishing code.
 *
 * A short phrase the user chooses, which we include in every email we send.
 * Mail without it didn't come from us — which is the only reliable way for
 * someone to tell a genuine notification from a convincing forgery.
 */
const Schema = z.object({ code: z.string().trim().min(4).max(24) });

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ code: null });
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { antiPhishingCode: true },
  });
  return Response.json({ code: u?.antiPhishingCode ?? null });
}

export async function PATCH(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  if (!rateLimit(`antiphish:${userId}`, { max: 10, windowMs: 600_000 }).allowed) {
    return Response.json({ error: "Too many changes. Try again later." }, { status: 429 });
  }

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Use 4 to 24 characters." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { antiPhishingCode: parsed.data.code },
  });
  // Changing it is exactly what an attacker would do, so the owner is told.
  await notify(userId, {
    type: "SECURITY",
    title: "Anti-phishing code updated",
    body: "Your anti-phishing code was changed. If this wasn't you, secure your account now.",
    href: "/settings/security",
  });
  return Response.json({ ok: true, code: parsed.data.code });
}
