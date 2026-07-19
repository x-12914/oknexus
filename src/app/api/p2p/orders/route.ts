import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { createP2POrder, listP2POrders } from "@/lib/p2p";

const CreateSchema = z.object({
  adId: z.string().min(1),
  fiatAmount: z.number().positive(),
  paymentMethod: z.string().min(1),
});

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ orders: [] });

  const orders = await listP2POrders(userId);
  return Response.json({ orders });
}

export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in to trade." }, { status: 401 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid trade request" }, { status: 400 });
  }
  try {
    const order = await createP2POrder({ userId, ...parsed.data });
    return Response.json(order);
  } catch (e) {
    const message = (e as Error).message;
    if (message === "INSUFFICIENT_BALANCE") {
      return Response.json(
        { error: "You don't hold enough crypto to escrow this sell order." },
        { status: 400 },
      );
    }
    return Response.json({ error: message }, { status: 400 });
  }
}
