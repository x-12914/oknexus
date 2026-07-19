import type { NextRequest } from "next/server";
import { sessionUserId } from "@/lib/auth";
import { getP2POrder } from "@/lib/p2p";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/p2p/orders/[id]">,
) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Order not found" }, { status: 404 });

  const { id } = await ctx.params;
  const order = await getP2POrder(userId, id);
  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }
  return Response.json(order);
}
