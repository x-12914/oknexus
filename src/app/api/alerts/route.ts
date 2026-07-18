import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { createAlert, listAlerts, PriceAlertError } from "@/lib/price-alerts";

const Schema = z.object({ symbol: z.string().min(1).max(12), target: z.number().positive() });

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ alerts: [], prices: {} });
  return Response.json(await listAlerts(userId));
}

export async function POST(req: Request) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Enter an asset and a target price." }, { status: 400 });
  }

  try {
    const alert = await createAlert(userId, parsed.data.symbol, parsed.data.target);
    return Response.json(alert);
  } catch (e) {
    if (e instanceof PriceAlertError) return Response.json({ error: e.message }, { status: 400 });
    return Response.json({ error: "Could not create the alert." }, { status: 500 });
  }
}
