import type { NextRequest } from "next/server";
import { z } from "zod";
import { getExchange } from "@/lib/exchange";
import { sessionUserId } from "@/lib/auth";

const MessageSchema = z.object({
  text: z.string().min(1).max(500),
});

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/p2p/orders/[id]/messages">,
) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = MessageSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid message" }, { status: 400 });
  }
  try {
    const order = await getExchange().sendP2PMessage(userId, id, parsed.data.text);
    return Response.json(order);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
