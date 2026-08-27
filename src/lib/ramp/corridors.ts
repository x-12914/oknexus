import "server-only";
import { quotePayout } from "./bitnob-payout";
import { bitnobConfigured, listPayoutCountries, type BitnobCountry } from "@/lib/bitnob";
import type { Corridor } from "./types";

/**
 * Payment corridors we can actually reach.
 *
 * Built from the provider's live supported-countries list rather than a
 * hardcoded table, so a corridor appearing or disappearing on their side shows
 * up here without a deploy.
 *
 * Only NGN carries a rate. It is the one corridor with a working off-ramp, and
 * pricing the other ten would mean creating a provider quote per corridor on
 * every page load. The rest are shown as reachable, without a number.
 *
 * There are deliberately no sparklines, which the design shows: we keep no FX
 * rate history, so any trend line would be drawn from nothing.
 */
const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; value: Corridor[] } | null = null;

/** Which country codes sit in which region, for the badge. */
const AFRICA = new Set(["NG", "GH", "KE", "UG", "RW", "CI", "CM", "GM", "SN", "SL", "TZ", "ZA"]);

/** Corridors with a working end-to-end payout today. */
const LIVE = new Set(["NGN"]);

export async function listCorridors(): Promise<Corridor[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.value;
  if (!bitnobConfigured()) return [];

  const countries = await listPayoutCountries();

  // One quote, for the one corridor we can price. Cached with the rest.
  let ngnRate: number | null = null;
  try {
    const q = await quotePayout({ fromSymbol: "USDT", fromAmount: 1 });
    ngnRate = q.effectiveRate > 0 ? q.effectiveRate : null;
  } catch {
    // A missing rate is fine — the tile simply doesn't show one.
  }

  const value: Corridor[] = countries.flatMap((c: BitnobCountry) =>
    (c.corridors ?? []).map((k) => ({
      country: c.code,
      countryName: c.name,
      flag: c.flag,
      currency: k.currency,
      methods: k.destination_types ?? [],
      region: AFRICA.has(c.code) ? ("africa" as const) : ("global" as const),
      live: LIVE.has(k.currency),
      rate: k.currency === "NGN" ? ngnRate : null,
    })),
  );

  cache = { at: now, value };
  return value;
}
