import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const Schema = z.object({ name: z.string().trim().min(1).max(60) });

/**
 * Update the signed-in user's display name.
 *
 * Deliberately narrow: only `name` is accepted. Email changes affect login and
 * verification, and role/KYC are decided elsewhere — accepting them here would
 * turn a profile edit into privilege escalation.
 */
export async function PATCH(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });

  if (!rateLimit(`profile:${userId}`, { max: 10, windowMs: 600_000 }).allowed) {
    return Response.json({ error: "Too many changes. Try again later." }, { status: 429 });
  }

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Enter a name between 1 and 60 characters." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data.name },
    select: { name: true },
  });
  return Response.json({ ok: true, name: user.name });
}
