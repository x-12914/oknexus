import { sessionUserId } from "@/lib/auth";
import { earnEnabled } from "@/lib/ramp/flags";
import { getEarn, EARN_PRODUCTS } from "@/lib/earn";

export async function GET() {
  const available = earnEnabled();
  const userId = await sessionUserId();
  if (!userId) {
    return Response.json({ products: EARN_PRODUCTS, positions: [], prices: {}, available });
  }
  // Positions are still returned when disabled — an existing stake must remain
  // visible and closable even once new ones are turned off.
  return Response.json({ ...(await getEarn(userId)), available });
}
