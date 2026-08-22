import { sessionUserId } from "@/lib/auth";
import { listPayouts } from "@/lib/ramp/payouts";

/** The signed-in user's recent fiat payouts. */
export async function GET() {
  const userId = await sessionUserId();
  // Anonymous callers get an empty list rather than a 401: the panel renders
  // for signed-out visitors too and shouldn't error out over an empty history.
  if (!userId) return Response.json({ payouts: [] });
  return Response.json({ payouts: await listPayouts(userId) });
}
