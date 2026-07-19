import type { NextRequest } from "next/server";
import { getExchange } from "@/lib/exchange";
import { pairToSymbol } from "@/lib/pair";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/markets/[pair]/ticker">,
) {
  const { pair } = await ctx.params;
  const ticker = await getExchange().getTicker(pairToSymbol(pair));
  return Response.json(ticker);
}
