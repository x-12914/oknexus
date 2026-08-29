import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateApiRequest, apiAuthError } from "@/lib/api-auth";
import { listOpenOrders, placeOrder, cancelOrder } from "@/lib/orders";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiAuthError(auth);
  const symbol = req.nextUrl.searchParams.get("symbol") ?? undefined;
  return Response.json({ orders: await listOpenOrders(auth.userId, symbol) });
}

const PlaceSchema = z.object({
  symbol: z.string().min(3).max(20),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["MARKET", "LIMIT", "STOP", "STOP_LIMIT"]),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  triggerPrice: z.number().positive().optional(),
});

export async function POST(req: NextRequest) {
  // Read the body as text once: it is what the client signed, and re-serialising
  // parsed JSON could differ by a byte and fail a legitimate signature.
  const raw = await req.text();
  const auth = await authenticateApiRequest(req, raw);
  if (!auth.ok) return apiAuthError(auth);
  if (!auth.canTrade) {
    return Response.json({ error: "This key is read-only." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = PlaceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid order parameters." }, { status: 400 });
  }

  try {
    const order = await placeOrder({ userId: auth.userId, ...parsed.data });
    return Response.json({ order });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

const CancelSchema = z.object({ orderId: z.string().min(3) });

export async function DELETE(req: NextRequest) {
  const raw = await req.text();
  const auth = await authenticateApiRequest(req, raw);
  if (!auth.ok) return apiAuthError(auth);
  if (!auth.canTrade) {
    return Response.json({ error: "This key is read-only." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = CancelSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "orderId is required." }, { status: 400 });

  try {
    // cancelOrder scopes by userId, so one key cannot cancel another account's order.
    return Response.json({ order: await cancelOrder(auth.userId, parsed.data.orderId) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
