import type { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sessionUser } from "@/lib/auth";
import { verifyOtp } from "@/lib/email-verify";
import { clientIp } from "@/lib/login-history";
import { rateLimit } from "@/lib/rate-limit";

const Schema = z.object({
  otp: z.string().min(6).max(6),
  password: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  const u = await sessionUser();
  if (!u) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    !rateLimit(`pwd-change:${clientIp(req.headers) ?? "?"}`, {
      max: 10,
      windowMs: 900_000,
      lockoutMs: 900_000,
    }).allowed
  ) {
    return Response.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid details. Make sure your password is at least 8 characters." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: u.id },
    select: { email: true },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await verifyOtp(user.email, parsed.data.otp);
  if (!valid) {
    return Response.json({ error: "Invalid or expired verification code." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  
  // Updating password and incrementing tokenVersion logs out other active sessions
  await prisma.user.update({
    where: { id: u.id },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });

  return Response.json({ ok: true });
}
