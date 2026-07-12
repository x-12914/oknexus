import type { NextRequest } from "next/server";
import { z } from "zod";
import { getExchange } from "@/lib/exchange";

const QuoteSchema = z.object({
  side: z.enum(["BUY", "SELL"]),
  baseSymbol: z.string().min(2),
  settleCurrency: z.string().min(2),
  baseAmount: z.number().positive(),
});

export async function POST(req: NextRequest) {
  const parsed = QuoteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid quote request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const quote = await getExchange().getOtcQuote(parsed.data);
    return Response.json(quote);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
