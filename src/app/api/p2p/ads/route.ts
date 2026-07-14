import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { listAds, createAd } from "@/lib/p2p";
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

  const viewerId = await sessionUserId();
  const ads = await listAds(viewerId, filter);
  return Response.json({ ads });
}

const CreateSchema = z.object({
  side: z.enum(["BUY", "SELL"]),
  asset: z.string().min(1),
  fiat: z.string().min(1),
  price: z.number().positive(),
  available: z.number().positive(),
  minLimit: z.number().positive(),
  maxLimit: z.number().positive(),
  paymentMethods: z.array(z.string().min(1)).min(1),
  terms: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in to post an ad." }, { status: 401 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Invalid ad" }, { status: 400 });

  try {
    const ad = await createAd(userId, parsed.data);
    return Response.json(ad);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "INSUFFICIENT_BALANCE") {
      return Response.json(
        { error: "You don't hold enough crypto to back this sell ad." },
        { status: 400 },
      );
    }
    return Response.json({ error: msg }, { status: 400 });
  }
}
