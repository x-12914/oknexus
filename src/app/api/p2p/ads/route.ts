import type { NextRequest } from "next/server";
import { getExchange } from "@/lib/exchange";
import type { OrderSide, P2PAdFilter } from "@/lib/exchange/types";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filter: P2PAdFilter = {};
  const side = sp.get("side");
  if (side === "BUY" || side === "SELL") filter.side = side as OrderSide;
  const asset = sp.get("asset");
  if (asset) filter.asset = asset;
  const fiat = sp.get("fiat");
  if (fiat) filter.fiat = fiat;
  const method = sp.get("method");
  if (method) filter.paymentMethod = method;

  const ads = await getExchange().listP2PAds(filter);
  return Response.json({ ads });
}
