import type { NextRequest } from "next/server";
import { z } from "zod";
import { pairToSymbol } from "@/lib/pair";
import { sessionUserId } from "@/lib/auth";
import { placeOrder, listOpenOrders } from "@/lib/orders";

const PlaceOrderSchema = z.object({
  pair: z.string().min(3),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["MARKET", "LIMIT", "STOP", "STOP_LIMIT"]),
  quantity: z.number().positive().finite(),
  price: z.number().positive().finite().optional(),
  triggerPrice: z.number().positive().finite().optional(),
});

export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in to trade." }, { status: 401 });

  const raw = await req.json();
  const parsed = PlaceOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid order", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  try {
    const order = await placeOrder({
      userId,
      symbol: pairToSymbol(input.pair),
      side: input.side,
      type: input.type,
      quantity: input.quantity,
      price: input.price,
      triggerPrice: input.triggerPrice,
    });
    return Response.json(order);
  } catch (e) {
    const message = (e as Error).message;
    if (message === "INSUFFICIENT_BALANCE") {
      return Response.json(
        { error: "Insufficient balance for this order." },
        { status: 400 },
      );
    }
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ orders: [] });

  const pair = req.nextUrl.searchParams.get("pair");
  const symbol = pair ? pairToSymbol(pair) : undefined;
  const orders = await listOpenOrders(userId, symbol);
  return Response.json({ orders });
}
