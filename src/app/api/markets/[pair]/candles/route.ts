import type { NextRequest } from "next/server";
import { getExchange, type CandleInterval } from "@/lib/exchange";
import { pairToSymbol } from "@/lib/pair";

const VALID: CandleInterval[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/markets/[pair]/candles">,
) {
  const { pair } = await ctx.params;
  const rawInterval = req.nextUrl.searchParams.get("interval") ?? "15m";
  const interval = (VALID as string[]).includes(rawInterval)
    ? (rawInterval as CandleInterval)
    : ("15m" as CandleInterval);
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "200");
  const candles = await getExchange().getCandles(pairToSymbol(pair), interval, limit);
  return Response.json({ candles });
}
