import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTotpOnce, decryptSecret } from "@/lib/totp";
import { DailyLimitError } from "@/lib/custody/withdrawals";
import { payoutConfigured } from "@/lib/ramp/bitnob-payout";
import { payoutRequiresKyc } from "@/lib/ramp/flags";
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

  // Two-factor is REQUIRED here, not merely honoured when the user happens to have
  // switched it on. This route sends real money to a bank account and the transfer
  // is not reversible, so an account with no second factor must not be able to
  // drain itself — a stolen session would otherwise be enough.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFAEnabled: true, twoFASecret: true },
  });
  if (!user?.twoFAEnabled || !user.twoFASecret) {
    return Response.json(
      {
        error:
          "Set up two-factor authentication before withdrawing to a bank account. You can turn it on under Settings, Security.",
        needsSetup: true,
      },
      { status: 403 },
    );
  }
  if (
    !rateLimit(`payout-2fa:${userId}`, { max: 6, windowMs: 600_000, lockoutMs: 600_000 }).allowed
  ) {
    return Response.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }
  const secret = decryptSecret(user.twoFASecret);
  const code = String(parsed.data.code ?? "");
  if (!code || !secret || !verifyTotpOnce(userId, secret, code)) {
    return Response.json(
      { error: "Enter your authenticator code to confirm this payout.", needCode: true },
      { status: 403 },
    );
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

/**
 * Controls for the UI. `needs2FA` is now unconditionally true — a fiat payout
 * always takes a code — while `twoFAReady` says whether the user has an
 * authenticator set up yet, so the panel can tell "enter your code" apart from
 * "go and enable this first".
 */
export async function GET() {
  const kycRequired = payoutRequiresKyc();
  const userId = await sessionUserId();
  if (!userId) {
    return Response.json({ needs2FA: true, twoFAReady: false, kycRequired, kycApproved: false });
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFAEnabled: true, kycStatus: true },
  });
  return Response.json({
    needs2FA: true,
    twoFAReady: !!user?.twoFAEnabled,
    kycRequired,
    kycApproved: user?.kycStatus === "APPROVED",
  });
}
