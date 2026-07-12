import type { NextRequest } from "next/server";
import { z } from "zod";
import { getExchange } from "@/lib/exchange";
import { pairToSymbol } from "@/lib/pair";

const DEMO_USER = "demo-user";

const PlaceOrderSchema = z.object({
  pair: z.string().min(3),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["MARKET", "LIMIT"]),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
});

export async function POST(req: NextRequest) {
  const raw = await req.json();
  const parsed = PlaceOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid order", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;
  if (input.type === "LIMIT" && input.price == null) {
    return Response.json({ error: "Limit orders require a price" }, { status: 400 });
  }

  const order = await getExchange().placeOrder({
    userId: DEMO_USER,
    symbol: pairToSymbol(input.pair),
    side: input.side,
    type: input.type,
    quantity: input.quantity,
    price: input.price,
  });

  return Response.json(order);
}

export async function GET(req: NextRequest) {
  const pair = req.nextUrl.searchParams.get("pair");
  const symbol = pair ? pairToSymbol(pair) : undefined;
  const orders = await getExchange().listOpenOrders(DEMO_USER, symbol);
  return Response.json({ orders });
}
