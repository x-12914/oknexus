import type { NextRequest } from "next/server";
import { z } from "zod";
import { getExchange } from "@/lib/exchange";

const DEMO_USER = "demo-user";

const ExecuteSchema = z.object({
  quoteId: z.string().min(3),
});

export async function POST(req: NextRequest) {
  const parsed = ExecuteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const result = await getExchange().executeRamp(DEMO_USER, parsed.data.quoteId);
    return Response.json(result);
  } catch (e) {
    const message = (e as Error).message;
    const status = message === "Quote expired" ? 410 : 400;
    return Response.json({ error: message }, { status });
  }
}
