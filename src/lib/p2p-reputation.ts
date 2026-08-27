import "server-only";
import { prisma } from "@/lib/db";
import type { P2PMerchant } from "@/lib/exchange/types";

/**
 * Merchant reputation, computed from actual trade history.
 *
 * This used to be a snapshot written when an ad was created — every new
 * advertiser showed "100% completion, 5.0 stars" before trading once, and the
 * seeded house merchants carried invented histories like "5,623 trades, 99.8%".
 * Reputation is the single thing a user leans on when deciding whether to trust
 * a stranger with money, so inventing it is worse than showing nothing.
 *
 * Star ratings are deliberately absent: there is no review mechanism, so any
 * number would be fabricated. Counts and rates come from real orders or are
 * reported as unknown.
 */

export interface MerchantStats {
  completedTrades: number;
  /** Null until there is enough history to mean anything. */
  completionRatePct: number | null;
  /** Median minutes from order creation to completion; null if never completed one. */
  avgReleaseMinutes: number | null;
  /** True when this advertiser has no completed trades yet. */
  isNew: boolean;
}

const EMPTY: MerchantStats = {
  completedTrades: 0,
  completionRatePct: null,
  avgReleaseMinutes: null,
  isNew: true,
};

export async function getMerchantStats(advertiserId: string | null): Promise<MerchantStats> {
  // House liquidity has no advertiser and therefore no personal track record.
  if (!advertiserId) return EMPTY;

  const orders = await prisma.p2POrder.findMany({
    where: { advertiserId },
    select: { status: true, createdAt: true, completedAt: true },
  });
  if (orders.length === 0) return EMPTY;

  const completed = orders.filter((o) => o.status === "COMPLETED");
  // Cancelled orders are excluded from the denominator: a buyer walking away
  // says nothing about the seller, whereas a dispute does.
  const decided = orders.filter((o) => o.status === "COMPLETED" || o.status === "DISPUTED");

  const releaseTimes = completed
    .filter((o) => o.completedAt)
    .map((o) => (o.completedAt!.getTime() - o.createdAt.getTime()) / 60_000)
    .sort((a, b) => a - b);

  return {
    completedTrades: completed.length,
    completionRatePct:
      decided.length > 0 ? Math.round((completed.length / decided.length) * 1000) / 10 : null,
    avgReleaseMinutes:
      releaseTimes.length > 0 ? Math.round(releaseTimes[Math.floor(releaseTimes.length / 2)]) : null,
    isNew: completed.length === 0,
  };
}

/** Batch version — one query for a page of ads rather than one per ad. */
export async function getMerchantStatsFor(
  advertiserIds: (string | null)[],
): Promise<Map<string, MerchantStats>> {
  const ids = [...new Set(advertiserIds.filter((v): v is string => Boolean(v)))];
  const out = new Map<string, MerchantStats>();
  if (ids.length === 0) return out;

  const orders = await prisma.p2POrder.findMany({
    where: { advertiserId: { in: ids } },
    select: { advertiserId: true, status: true, createdAt: true, completedAt: true },
  });

  const byAdvertiser = new Map<string, typeof orders>();
  for (const o of orders) {
    if (!o.advertiserId) continue;
    const list = byAdvertiser.get(o.advertiserId) ?? [];
    list.push(o);
    byAdvertiser.set(o.advertiserId, list);
  }

  for (const id of ids) {
    const list = byAdvertiser.get(id) ?? [];
    const completed = list.filter((o) => o.status === "COMPLETED");
    const decided = list.filter((o) => o.status === "COMPLETED" || o.status === "DISPUTED");
    const releaseTimes = completed
      .filter((o) => o.completedAt)
      .map((o) => (o.completedAt!.getTime() - o.createdAt.getTime()) / 60_000)
      .sort((a, b) => a - b);
    out.set(id, {
      completedTrades: completed.length,
      completionRatePct:
        decided.length > 0 ? Math.round((completed.length / decided.length) * 1000) / 10 : null,
      avgReleaseMinutes:
        releaseTimes.length > 0
          ? Math.round(releaseTimes[Math.floor(releaseTimes.length / 2)])
          : null,
      isNew: completed.length === 0,
    });
  }
  return out;
}

/**
 * Rebuild a merchant from the stored blob plus live stats.
 *
 * Constructed field by field rather than spread: the stored JSON still carries
 * keys from the old shape, including the invented `rating`, and spreading would
 * keep leaking them through the API even though the type no longer declares
 * them. Only these fields ever reach a client.
 */
export function withRealStats(merchant: P2PMerchant, stats: MerchantStats): P2PMerchant {
  return {
    id: merchant.id,
    name: merchant.name,
    online: merchant.online,
    verified: merchant.verified,
    completedTrades: stats.completedTrades,
    completionRatePct: stats.completionRatePct,
    avgReleaseMinutes: stats.avgReleaseMinutes,
    isNew: stats.isNew,
  };
}

/**
 * Normalise a house-liquidity merchant blob.
 *
 * Ads seeded before reputation was made real still hold invented names and
 * histories. Rewriting them on read means an old row can't resurface a fake
 * track record, and no migration is needed.
 */
export function asHouseMerchant(merchant: P2PMerchant): P2PMerchant {
  return {
    id: merchant.id,
    name: "OKNexus Liquidity",
    online: merchant.online,
    completedTrades: 0,
    completionRatePct: null,
    avgReleaseMinutes: null,
    // Not "new" — it is house liquidity, which simply has no personal record.
    isNew: false,
    verified: true,
  };
}
