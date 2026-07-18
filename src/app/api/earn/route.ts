import { sessionUserId } from "@/lib/auth";
import { getEarn, EARN_PRODUCTS } from "@/lib/earn";

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ products: EARN_PRODUCTS, positions: [], prices: {} });
  return Response.json(await getEarn(userId));
}
