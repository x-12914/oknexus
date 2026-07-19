import type { NextRequest } from "next/server";
import { sessionUserId } from "@/lib/auth";
import { cancelOrder } from "@/lib/orders";

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/orders/[id]">,
) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await ctx.params;
  try {
    const order = await cancelOrder(userId, id);
    return Response.json(order);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 404 });
  }
}
