import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getPayoutConfig, quotePayout, payoutConfigured } from "@/lib/ramp/bitnob-payout";

const QuoteSchema = z
  .object({
    fromSymbol: z.string().min(2).max(10),
    fromAmount: z.number().positive().finite().optional(),
    fiatAmount: z.number().positive().finite().optional(),
    /** Corridor. Omitted means Nigeria, which is what every caller sent before. */
    country: z.string().length(2).optional(),
    fiatCode: z.string().length(3).optional(),
  })
  .refine((v) => (v.fromAmount === undefined) !== (v.fiatAmount === undefined), {
    message: "Provide exactly one of fromAmount or fiatAmount",
  });

export async function POST(req: NextRequest) {
  if (!payoutConfigured()) {
    return Response.json({ error: "Payouts are not available right now." }, { status: 503 });
  }
  // Session-gated on purpose: unlike the simulated ramp, each quote creates a
  // real record at the provider, so anonymous traffic would be spending our
  // rate limit on their infrastructure.
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in to continue." }, { status: 401 });

  const limited = rateLimit(`payout-quote:${userId}`, { max: 30, windowMs: 60_000 });
  if (!limited.allowed) {
    return Response.json(
      { error: `Too many quote requests. Try again in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const parsed = QuoteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid quote request" }, { status: 400 });
  }

  try {
    const { fiatAmount, country } = parsed.data;
    // Bound-check against the corridor being quoted. Only the Nigeria config
    // carries min/max in this shape; other corridors publish their limits per
    // destination, which the picker already enforces, and the provider rejects
    // an out-of-range amount regardless.
    if (!country || country.toUpperCase() === "NG") {
      const config = await getPayoutConfig();
      if (fiatAmount !== undefined && (fiatAmount < config.minFiat || fiatAmount > config.maxFiat)) {
        return Response.json(
          {
            error: `Amount must be between ${config.minFiat.toLocaleString()} and ${config.maxFiat.toLocaleString()} ${config.fiatCode}.`,
          },
          { status: 400 },
        );
      }
    }
    return Response.json(await quotePayout(parsed.data));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
