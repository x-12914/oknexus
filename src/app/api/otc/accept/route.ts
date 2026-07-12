import type { NextRequest } from "next/server";
import { z } from "zod";
import { getExchange } from "@/lib/exchange";
import { sessionUserId } from "@/lib/auth";

const AcceptSchema = z.object({
  quoteId: z.string().min(3),
});

export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in to settle." }, { status: 401 });

  const parsed = AcceptSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const result = await getExchange().acceptOtcQuote(userId, parsed.data.quoteId);
    return Response.json(result);
  } catch (e) {
    const message = (e as Error).message;
    const status = message === "Quote expired" ? 410 : 400;
    return Response.json({ error: message }, { status });
  }
}
