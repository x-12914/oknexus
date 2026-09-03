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
 * Basic sits between the two originals. A name and NIN matched against the
 * national identity register is real verification: a made-up number is not in
 * the register, and a stolen one fails the name match. It is not a document
 * check though, so it never unlocks fiat. Cash-out stays behind the document
 * and selfie tier, which is what a licensing review expects to find.
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
    id: "basic",
    label: "Basic",
    requirement: "Your name and NIN, matched against the national identity register",
    dailyWithdrawUsd: Number(process.env.LIMIT_BASIC_USD ?? 500),
    fiatWithdrawal: false,
    perks: ["Everything above", "A higher daily limit for crypto withdrawals"],
  },
  {
    id: "verified",
    label: "Verified",
    requirement: "Government ID and a selfie, checked automatically",
    dailyWithdrawUsd: Number(process.env.WITHDRAW_DAILY_USD_LIMIT ?? 2000),
    fiatWithdrawal: true,
    perks: ["Everything above", "Cash out to a bank account", "The highest daily limit"],
  },
];

/** The two verification results a user can hold. Both live on the User row. */
export interface KycStanding {
  /** Document + selfie (+ AML). The only status anything fiat-related reads. */
  kycStatus: KycStatus;
  /** Name + NIN against the register. Raises the crypto cap, nothing more. */
  kycBasicStatus: KycStatus;
}

export function tierFor(k: KycStanding): VerificationTier {
  if (k.kycStatus === "APPROVED") return TIERS[2];
  if (k.kycBasicStatus === "APPROVED") return TIERS[1];
  return TIERS[0];
}

export async function tierForUser(userId: string): Promise<VerificationTier> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycStatus: true, kycBasicStatus: true },
  });
  return tierFor({
    kycStatus: u?.kycStatus ?? "NONE",
    kycBasicStatus: u?.kycBasicStatus ?? "NONE",
  });
}
