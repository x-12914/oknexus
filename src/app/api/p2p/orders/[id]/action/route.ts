import type { NextRequest } from "next/server";
import { z } from "zod";
import { getExchange } from "@/lib/exchange";

const DEMO_USER = "demo-user";

const ActionSchema = z.object({
  action: z.enum(["MARK_PAID", "RELEASE", "CANCEL", "DISPUTE"]),
});

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/p2p/orders/[id]/action">,
) {
  const { id } = await ctx.params;
  const parsed = ActionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }
  try {
    const order = await getExchange().actP2POrder(DEMO_USER, id, parsed.data.action);
    return Response.json(order);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
