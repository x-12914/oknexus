import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTotpOnce, decryptSecret } from "@/lib/totp";
import { DailyLimitError } from "@/lib/custody/withdrawals";
import { payoutConfigured } from "@/lib/ramp/bitnob-payout";
import { requestPayout } from "@/lib/ramp/payouts";

const Schema = z.object({
  payoutId: z.string().min(8),
  bankCode: z.string().min(2).max(20),
  accountNumber: z.string().min(4).max(34),
  code: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in to withdraw." }, { status: 401 });
  if (!payoutConfigured()) {
    return Response.json({ error: "Payouts are not available right now." }, { status: 503 });
  }

  if (!rateLimit(`payout-exec:${userId}`, { max: 10, windowMs: 600_000 }).allowed) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  // Same 2FA gate as on-chain withdrawals. Without it this route would be a way
  // around that control — it drains the same balances, just to a bank account.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFAEnabled: true, twoFASecret: true },
  });
  if (user?.twoFAEnabled) {
    if (
      !rateLimit(`payout-2fa:${userId}`, { max: 6, windowMs: 600_000, lockoutMs: 600_000 }).allowed
    ) {
      return Response.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }
    const secret = user.twoFASecret ? decryptSecret(user.twoFASecret) : null;
    const code = String(parsed.data.code ?? "");
    if (!code || !secret || !verifyTotpOnce(userId, secret, code)) {
      return Response.json(
        { error: "Enter your authenticator code to confirm this payout.", needCode: true },
        { status: 403 },
      );
    }
  }

  try {
    // requestPayout enforces the shared rolling-24h cap internally, once it has
    // re-read the quote and knows the real amount.
    const payout = await requestPayout(userId, parsed.data);
    return Response.json(payout);
  } catch (e) {
    if (e instanceof DailyLimitError) return Response.json({ error: e.message }, { status: 400 });
    const msg = (e as Error).message;
    if (msg === "INSUFFICIENT_BALANCE") {
      return Response.json(
        { error: "Insufficient balance to cover this payout." },
        { status: 400 },
      );
    }
    return Response.json({ error: msg }, { status: 400 });
  }
}

/** Controls for the UI: whether a 2FA code is needed before submitting. */
export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ needs2FA: false });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFAEnabled: true },
  });
  return Response.json({ needs2FA: !!user?.twoFAEnabled });
}
