import type { NextRequest } from "next/server";
import { z } from "zod";
import { getExchange } from "@/lib/exchange";
import { sessionUserId } from "@/lib/auth";
import { settleSwap } from "@/lib/wallet";

const ExecuteSchema = z.object({
  quoteId: z.string().min(3),
});

export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in to swap." }, { status: 401 });

  const parsed = ExecuteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const result = await getExchange().executeSwap(userId, parsed.data.quoteId);
    // Move the balances in the user's wallets.
    await settleSwap(
      userId,
      result.fromSymbol,
      result.fromAmount,
      result.toSymbol,
      result.toAmount,
    );
    return Response.json(result);
  } catch (e) {
    const message = (e as Error).message;
    if (message === "INSUFFICIENT_BALANCE") {
      return Response.json(
        { error: "Insufficient balance to complete this swap." },
        { status: 400 },
      );
    }
    const status = message === "Quote expired" ? 410 : 400;
    return Response.json({ error: message }, { status });
  }
}
