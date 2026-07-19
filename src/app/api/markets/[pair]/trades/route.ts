import type { NextRequest } from "next/server";
import { getExchange } from "@/lib/exchange";
import { pairToSymbol } from "@/lib/pair";

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/markets/[pair]/trades">,
) {
  const { pair } = await ctx.params;
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "30");
  const trades = await getExchange().getRecentTrades(pairToSymbol(pair), limit);
  return Response.json({ trades });
}
