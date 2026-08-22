import type { NextRequest } from "next/server";
import { sessionUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getPayoutConfig, lookupAccount, payoutConfigured } from "@/lib/ramp/bitnob-payout";

/** Resolve a bank account to its registered holder, for confirmation before sending. */
export async function GET(req: NextRequest) {
  if (!payoutConfigured()) {
    return Response.json({ error: "Payouts are not available right now." }, { status: 503 });
  }
  // Session-gated: this queries a third party per call, and an open endpoint
  // would let anyone use us to enumerate names against account numbers.
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in to continue." }, { status: 401 });

  if (!rateLimit(`payout-resolve:${userId}`, { max: 20, windowMs: 60_000 }).allowed) {
    return Response.json({ error: "Too many lookups. Try again shortly." }, { status: 429 });
  }

  const bankCode = req.nextUrl.searchParams.get("bankCode") ?? "";
  const accountNumber = req.nextUrl.searchParams.get("accountNumber") ?? "";

  try {
    const config = await getPayoutConfig();
    if (!config.banks.some((b) => b.code === bankCode)) {
      return Response.json({ error: "Select a valid bank." }, { status: 400 });
    }
    if (!new RegExp(config.fields.accountPattern).test(accountNumber)) {
      return Response.json({ error: "That account number isn't valid." }, { status: 400 });
    }
    return Response.json(await lookupAccount(bankCode, accountNumber));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
