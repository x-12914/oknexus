import type { NextRequest } from "next/server";
import { z } from "zod";
import { getExchange } from "@/lib/exchange";
import { sessionUserId } from "@/lib/auth";

const CreateSchema = z.object({
  adId: z.string().min(1),
  fiatAmount: z.number().positive(),
  paymentMethod: z.string().min(1),
});

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ orders: [] });

  const orders = await getExchange().listP2POrders(userId);
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
    const order = await getExchange().createP2POrder({
      userId,
      ...parsed.data,
    });
    return Response.json(order);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
