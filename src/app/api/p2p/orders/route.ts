import type { NextRequest } from "next/server";
import { z } from "zod";
import { getExchange } from "@/lib/exchange";

const DEMO_USER = "demo-user";

const CreateSchema = z.object({
  adId: z.string().min(1),
  fiatAmount: z.number().positive(),
  paymentMethod: z.string().min(1),
});

export async function GET() {
  const orders = await getExchange().listP2POrders(DEMO_USER);
  return Response.json({ orders });
}

export async function POST(req: NextRequest) {
  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid trade request" }, { status: 400 });
  }
  try {
    const order = await getExchange().createP2POrder({
      userId: DEMO_USER,
      ...parsed.data,
    });
    return Response.json(order);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
