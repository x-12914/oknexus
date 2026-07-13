import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { actP2POrder } from "@/lib/p2p";

const ActionSchema = z.object({
  action: z.enum(["MARK_PAID", "RELEASE", "CANCEL", "DISPUTE"]),
});

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/p2p/orders/[id]/action">,
) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = ActionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }
  try {
    const order = await actP2POrder(userId, id, parsed.data.action);
    return Response.json(order);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
