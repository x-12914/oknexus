import "server-only";
import { prisma } from "@/lib/db";

/**
 * The fee schedule — one source of truth for what OKNexus charges.
 *
 * Fees were previously scattered: a per-market taker rate in the Market table,
 * a hardcoded swap constant in the mock connector, a flat withdrawal table, and
 * nothing at all on P2P. That made it impossible to answer "what do we charge?"
 * without reading four files, and impossible to change a rate in one place.
 *
 * Rates are fractions: 0.0025 is 0.25%.
 *
 * Cost differs by transaction type, so these are deliberately NOT one number:
 *  - trading is priced on volume and competes with other exchanges
 *  - conversion carries a spread rather than a line-item fee
 *  - withdrawals must cover a real, variable network cost
 *  - deposits cost us nothing and are free
 */

export interface VipTier {
  id: string;
  label: string;
  /** Inclusive lower bound of trailing-30d USD volume. */
  minVolumeUsd: number;
  /** Exclusive upper bound, or null for the top tier. */
  maxVolumeUsd: number | null;
  /** Taker rate at this tier. */
  tradingPct: number;
}

export const VIP_TIERS: VipTier[] = [
  { id: "standard", label: "Standard", minVolumeUsd: 0, maxVolumeUsd: 10_000, tradingPct: 0.0025 },
  { id: "silver", label: "Silver", minVolumeUsd: 10_000, maxVolumeUsd: 50_000, tradingPct: 0.002 },
  { id: "gold", label: "Gold", minVolumeUsd: 50_000, maxVolumeUsd: 250_000, tradingPct: 0.0015 },
  { id: "platinum", label: "Platinum", minVolumeUsd: 250_000, maxVolumeUsd: null, tradingPct: 0.001 },
];

/**
 * Makers pay half the taker rate.
 *
 * The client's schedule quotes a single rate per tier and doesn't mention the
 * split, but the existing markets already price makers at half (0.10% vs
 * 0.20%). Keeping the distinction is standard and it pays people to post
 * liquidity, which a young order book needs more than it needs the revenue.
 * Set to 1 to charge makers and takers alike.
 */
export const MAKER_MULTIPLIER = 0.5;

/**
 * Non-trading rates. The client gave ranges; these sit at the competitive end
 * on the reasoning that early volume is worth more than early margin. Raising
 * them later is a one-line change here.
 */
export const SWAP_PCT = 0.005; // range given: 0.5%–1.0%
export const RAMP_PCT = 0.005; // buy/sell crypto, range given: 0.5%–1.0%
export const P2P_PCT = 0.0025; // range given: 0.25%–0.5%
export const DEPOSIT_PCT = 0; // deposits are free and cost us nothing

/**
 * Margin added on top of the measured network cost of a withdrawal.
 *
 * The client asked for network fees to be dynamic per asset, because a BTC
 * transaction and an ERC-20 transfer have nothing in common cost-wise, with a
 * small margin above actual cost as secondary revenue.
 */
export const WITHDRAWAL_MARGIN_PCT = 0.2;

/** Discount when trading fees are paid in OKN. Inert until the token exists. */
export const OKN_DISCOUNT_PCT = 0.2;

/**
 * The OKN token does not exist yet, so this is a hook rather than a feature.
 * It stays off until there is a token to pay with and a balance to pay from.
 */
export function oknDiscountEnabled(): boolean {
  return process.env.ENABLE_OKN_FEE_DISCOUNT === "true";
}

export function tierForVolume(volumeUsd: number): VipTier {
  // Walk downwards so the highest qualifying tier wins.
  for (let i = VIP_TIERS.length - 1; i >= 0; i--) {
    if (volumeUsd >= VIP_TIERS[i].minVolumeUsd) return VIP_TIERS[i];
  }
  return VIP_TIERS[0];
}

export interface FeeProfile {
  tier: VipTier;
  volumeUsd: number;
  /** Effective rates after any tier and token discounts. */
  takerPct: number;
  makerPct: number;
  swapPct: number;
  rampPct: number;
  p2pPct: number;
  /** Whether the OKN discount is currently being applied. */
  oknDiscountApplied: boolean;
  /** Volume still needed to reach the next tier, or null at the top. */
  nextTier: { tier: VipTier; volumeToGoUsd: number } | null;
}

/**
 * Trailing-30-day traded volume in USD.
 *
 * Counts spot trades and swaps: the activity the tiers are meant to reward.
 * Deliberately excludes deposits, withdrawals and fiat payouts — those are
 * movement rather than trading, and counting them would let someone tier up by
 * shuffling money in and out without ever taking a position.
 */
export async function tradingVolume30dUsd(userId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [trades, swaps] = await Promise.all([
    prisma.trade.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { price: true, quantity: true },
    }),
    prisma.swapTx.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { fromAmount: true, fromSymbol: true },
    }),
  ]);

  const spot = trades.reduce((sum, t) => sum + Number(t.price) * Number(t.quantity), 0);
  // Swaps are valued off the stablecoin leg where there is one; anything else
  // is ignored rather than guessed at, so the number is never inflated.
  const swapped = swaps.reduce(
    (sum, s) => sum + (s.fromSymbol === "USDT" || s.fromSymbol === "USDC" ? Number(s.fromAmount) : 0),
    0,
  );
  return spot + swapped;
}

export async function getFeeProfile(userId: string): Promise<FeeProfile> {
  const volumeUsd = await tradingVolume30dUsd(userId);
  const tier = tierForVolume(volumeUsd);

  // The token discount applies to trading only — it is meant to drive trading
  // demand, and discounting the withdrawal margin would eat a real cost.
  const applyOkn = oknDiscountEnabled();
  const discount = applyOkn ? 1 - OKN_DISCOUNT_PCT : 1;

  const idx = VIP_TIERS.findIndex((t) => t.id === tier.id);
  const next = idx >= 0 && idx < VIP_TIERS.length - 1 ? VIP_TIERS[idx + 1] : null;

  return {
    tier,
    volumeUsd,
    takerPct: tier.tradingPct * discount,
    makerPct: tier.tradingPct * MAKER_MULTIPLIER * discount,
    swapPct: SWAP_PCT,
    rampPct: RAMP_PCT,
    p2pPct: P2P_PCT,
    oknDiscountApplied: applyOkn,
    nextTier: next ? { tier: next, volumeToGoUsd: Math.max(0, next.minVolumeUsd - volumeUsd) } : null,
  };
}

/**
 * What to charge on a fiat payout, on top of the provider's own spread.
 *
 * The provider already takes roughly 0.20% inside the rate; this is the
 * OKNexus margin on top, and it is what makes the off-ramp earn anything.
 */
export function rampFeeOn(amount: number): number {
  return amount * RAMP_PCT;
}
