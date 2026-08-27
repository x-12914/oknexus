import "server-only";
import { prisma } from "@/lib/db";
import type { KycStatus } from "@prisma/client";
import type { VerificationTier } from "@/lib/limits-types";

/**
 * Verification tiers and the limits attached to them.
 *
 * The rolling-24h cap used to be one number for everybody, which meant
 * verifying your identity bought you nothing but the ability to reach a bank
 * account. Tying the limit to the tier is what actually makes verification
 * worth doing, and it keeps unverified exposure small.
 *
 * Values are deliberately conservative. Raising them is a business decision
 * that should be made once, on purpose, rather than drifting upward.
 */
export const TIERS: VerificationTier[] = [
  {
    id: "unverified",
    label: "Unverified",
    requirement: "Email confirmed",
    dailyWithdrawUsd: Number(process.env.LIMIT_UNVERIFIED_USD ?? 200),
    fiatWithdrawal: false,
    perks: ["Trade, swap and hold", "Crypto withdrawals up to the daily cap"],
  },
  {
    id: "verified",
    label: "Verified",
    requirement: "Government ID and a selfie, checked automatically",
    dailyWithdrawUsd: Number(process.env.WITHDRAW_DAILY_USD_LIMIT ?? 2000),
    fiatWithdrawal: true,
    perks: ["Everything above", "Cash out to a bank account", "A higher daily limit"],
  },
];

export function tierFor(kycStatus: KycStatus): VerificationTier {
  return kycStatus === "APPROVED" ? TIERS[1] : TIERS[0];
}

export async function tierForUser(userId: string): Promise<VerificationTier> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycStatus: true },
  });
  return tierFor(u?.kycStatus ?? "NONE");
}
