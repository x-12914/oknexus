import type { NextRequest } from "next/server";
import { getExchange } from "@/lib/exchange";

const DEMO_USER = "demo-user";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/p2p/orders/[id]">,
) {
  const { id } = await ctx.params;
  const order = await getExchange().getP2POrder(DEMO_USER, id);
  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }
  return Response.json(order);
}
