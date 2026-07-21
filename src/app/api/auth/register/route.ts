import type { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { ensureWallets } from "@/lib/wallet";
import { emailConfigured } from "@/lib/email";
import { sendOtpEmail } from "@/lib/email-verify";
import { notify } from "@/lib/notifications";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().trim().max(80).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Enter a valid email and a password of at least 8 characters." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: parsed.data.name || null,
      // emailVerified left null — account is inactive until OTP is confirmed.
    },
  });

  // Seed the new account with demo wallet balances.
  await ensureWallets(user.id);

  // A first notification so the feed isn't empty on day one.
  await notify(user.id, {
    type: "SYSTEM",
    title: "Welcome to OKNexus",
    body: "Your account is ready. Fund your wallet to start trading.",
    href: "/wallet",
  });

  // Send OTP verification code (required before account is active).
  if (emailConfigured()) {
    try {
      await sendOtpEmail(user.email, user.name);
    } catch (err) {
      console.error("OTP send failed:", err);
      // Non-fatal — client will show resend option.
    }
    return Response.json({ ok: true, needsVerification: true });
  }

  // Email not configured (dev): skip verification, activate immediately.
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  return Response.json({ ok: true, needsVerification: false });
}
