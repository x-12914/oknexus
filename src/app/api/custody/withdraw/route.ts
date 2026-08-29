import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_CHAIN, isChainEnabled } from "@/lib/custody/registry";
import {
  requestWithdrawal,
  dailyLimitStatus,
  DailyLimitError,
} from "@/lib/custody/withdrawals";
import { turnkeyConfigured } from "@/lib/turnkey";
import { verifyTotpOnce, decryptSecret } from "@/lib/totp";
import { rateLimit } from "@/lib/rate-limit";
import { withIdempotency, idempotencyKeyFrom, IdempotencyConflict } from "@/lib/idempotency";

const Schema = z.object({
  chain: z.string().optional(),
  symbol: z.string().min(1),
  amount: z.number().positive().finite(),
  toAddress: z.string().min(6),
  code: z.string().optional(),
});

function custodyReady(): boolean {
  return turnkeyConfigured() || !!process.env.CUSTODY_MNEMONIC;
}

// Withdrawal controls status for the UI: whether a 2FA code is required + the
// remaining rolling-24h limit.
export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ needs2FA: false, limit: null });
  const [user, limit] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { twoFAEnabled: true } }),
    dailyLimitStatus(userId),
  ]);
  return Response.json({ needs2FA: !!user?.twoFAEnabled, limit });
}

export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in to withdraw." }, { status: 401 });
  if (!custodyReady()) {
    return Response.json({ error: "Custody is not configured yet." }, { status: 503 });
  }
  // Read once as text: the idempotency hash must cover the exact bytes sent.
  const rawText = await req.text();
  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const chain = parsed.data.chain || DEFAULT_CHAIN;
  if (!isChainEnabled(chain)) {
    return Response.json({ error: "Unsupported chain" }, { status: 400 });
  }

  // 2FA-on-withdraw: when the account has 2FA, a fresh authenticator code is required
  // to confirm so a hijacked session can't drain funds without the device.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFAEnabled: true, twoFASecret: true },
  });
  if (user?.twoFAEnabled) {
    if (
      !rateLimit(`withdraw-2fa:${userId}`, { max: 6, windowMs: 600_000, lockoutMs: 600_000 }).allowed
    ) {
      return Response.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }
    const secret = user.twoFASecret ? decryptSecret(user.twoFASecret) : null;
    const code = String(parsed.data.code ?? "");
    if (!code || !secret || !verifyTotpOnce(userId, secret, code)) {
      return Response.json(
        { error: "Enter your authenticator code to confirm this withdrawal.", needCode: true },
        { status: 403 },
      );
    }
  }

  try {
    // The one place a duplicate submit is unambiguously expensive: two
    // withdrawals to the same address, both funded, both irreversible.
    return await withIdempotency(
      userId,
      idempotencyKeyFrom(req),
      "custody:withdraw",
      rawText,
      async () => {
        // The cap is asserted inside requestWithdrawal's transaction, under a
        // per-user lock — checking it out here as well would be a racy no-op.
        const w = await requestWithdrawal(
          userId,
          chain,
          parsed.data.symbol,
          parsed.data.amount,
          parsed.data.toAddress,
        );
        return Response.json({ id: w.id, status: w.status });
      },
    );
  } catch (e) {
    if (e instanceof IdempotencyConflict) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof DailyLimitError) return Response.json({ error: e.message }, { status: 400 });
    const msg = (e as Error).message;
    if (msg === "INSUFFICIENT_BALANCE") {
      return Response.json({ error: "Insufficient balance to withdraw that amount." }, { status: 400 });
    }
    return Response.json({ error: msg }, { status: 400 });
  }
}
