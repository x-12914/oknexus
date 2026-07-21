import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyOtp, sendOtpEmail } from "@/lib/email-verify";
import { emailConfigured } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/login-history";

const ConfirmSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
});

const ResendSchema = z.object({
  email: z.string().email(),
});

// POST /api/auth/verify-email/confirm — verify the OTP and activate the account.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = ConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid code." }, { status: 400 });
  }

  const { email, code } = parsed.data;
  const normalEmail = email.trim().toLowerCase();

  // Rate-limit OTP attempts per email+IP to prevent brute-force.
  const ip = clientIp(req.headers);
  const rlKey = `otp-confirm:${normalEmail}:${ip ?? "?"}`;
  if (!rateLimit(rlKey, { max: 10, windowMs: 900_000, lockoutMs: 900_000 }).allowed) {
    return Response.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { email: normalEmail },
    select: { id: true, emailVerified: true },
  });
  if (!user) {
    return Response.json({ error: "Account not found." }, { status: 404 });
  }
  if (user.emailVerified) {
    return Response.json({ ok: true, alreadyVerified: true });
  }

  const valid = await verifyOtp(normalEmail, code);
  if (!valid) {
    return Response.json({ error: "That code is incorrect or has expired." }, { status: 400 });
  }

  // Activate the account.
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  return Response.json({ ok: true });
}

// PUT /api/auth/verify-email/confirm — resend the OTP (unauthenticated, pre-login).
export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = ResendSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid email." }, { status: 400 });
  }

  const normalEmail = parsed.data.email.trim().toLowerCase();

  // Rate-limit resends.
  const ip = clientIp(req.headers);
  const rlKey = `otp-resend:${normalEmail}:${ip ?? "?"}`;
  if (!rateLimit(rlKey, { max: 5, windowMs: 900_000, lockoutMs: 900_000 }).allowed) {
    return Response.json({ error: "Too many resend attempts. Please wait before trying again." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { email: normalEmail },
    select: { id: true, email: true, name: true, emailVerified: true },
  });
  if (!user) return Response.json({ error: "Account not found." }, { status: 404 });
  if (user.emailVerified) return Response.json({ ok: true, alreadyVerified: true });

  if (!emailConfigured()) {
    return Response.json({ error: "Email delivery is not configured." }, { status: 503 });
  }

  try {
    await sendOtpEmail(user.email, user.name);
  } catch {
    return Response.json({ error: "Could not send the code right now. Please try again." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
