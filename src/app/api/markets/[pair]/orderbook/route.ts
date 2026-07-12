import type { NextRequest } from "next/server";
import { getExchange } from "@/lib/exchange";
import { pairToSymbol } from "@/lib/pair";

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/markets/[pair]/orderbook">,
) {
  const { pair } = await ctx.params;
  const depth = Number(req.nextUrl.searchParams.get("depth") ?? "20");
  const book = await getExchange().getOrderBook(pairToSymbol(pair), depth);
  return Response.json(book);
}
