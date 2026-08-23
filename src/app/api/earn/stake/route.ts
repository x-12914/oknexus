import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { stake, EarnError } from "@/lib/earn";
import { earnEnabled } from "@/lib/ramp/flags";

const Schema = z.object({ symbol: z.string().min(1).max(12), amount: z.number().positive().finite() });

export async function POST(req: Request) {
  if (!earnEnabled()) {
    return Response.json({ error: "Earn isn't available right now." }, { status: 503 });
  }
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Enter an asset and amount." }, { status: 400 });

  try {
    return Response.json(await stake(userId, parsed.data.symbol, parsed.data.amount));
  } catch (e) {
    if (e instanceof EarnError) return Response.json({ error: e.message }, { status: 400 });
    return Response.json({ error: "Could not stake." }, { status: 500 });
  }
}
