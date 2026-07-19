import type { NextRequest } from "next/server";
import { z } from "zod";
import { getExchange } from "@/lib/exchange";

const QuoteSchema = z.object({
  from: z.string().min(2),
  to: z.string().min(2),
  amount: z.number().positive(),
});

export async function POST(req: NextRequest) {
  const parsed = QuoteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid quote request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { from, to, amount } = parsed.data;
  try {
    const quote = await getExchange().getSwapQuote(from, to, amount);
    return Response.json(quote);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
