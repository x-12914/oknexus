import type { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { readResetToken } from "@/lib/password-reset";

const Schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Choose a password of at least 8 characters." },
      { status: 400 },
    );
  }

  const userId = await readResetToken(parsed.data.token);
  if (!userId) {
    return Response.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 },
    );
  }

  // Updating the hash invalidates this reset token (signed over the old hash) AND —
  // via the tokenVersion bump — revokes every existing session, evicting an attacker
  // who was already logged in on the account being recovered.
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });

  return Response.json({ ok: true });
}
