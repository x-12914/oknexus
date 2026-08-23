import { sessionUserId } from "@/lib/auth";
import {
  VIP_TIERS,
  SWAP_PCT,
  RAMP_PCT,
  P2P_PCT,
  DEPOSIT_PCT,
  OKN_DISCOUNT_PCT,
  getFeeProfile,
  oknDiscountEnabled,
  tierForVolume,
} from "@/lib/fees";

/**
 * The fee schedule, plus this user's tier and trailing volume.
 *
 * Public: the schedule is a selling point, and a signed-out visitor should be
 * able to see what trading here costs. Only the personalised part needs a session.
 */
export async function GET() {
  const schedule = {
    tiers: VIP_TIERS,
    swapPct: SWAP_PCT,
    rampPct: RAMP_PCT,
    p2pPct: P2P_PCT,
    depositPct: DEPOSIT_PCT,
    oknDiscountPct: OKN_DISCOUNT_PCT,
    oknDiscountActive: oknDiscountEnabled(),
  };

  const userId = await sessionUserId();
  if (!userId) {
    return Response.json({ schedule, profile: null, defaultTier: tierForVolume(0) });
  }
  return Response.json({ schedule, profile: await getFeeProfile(userId) });
}
