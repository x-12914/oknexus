import type { NextRequest } from "next/server";
import { getExchange } from "@/lib/exchange";

const DEMO_USER = "demo-user";

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/orders/[id]">,
) {
  const { id } = await ctx.params;
  try {
    const order = await getExchange().cancelOrder(DEMO_USER, id);
    return Response.json(order);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 404 });
  }
}
