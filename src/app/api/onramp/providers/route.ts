import { sessionUserId } from "@/lib/auth";
import { listOnrampProviders, listOnrampOrders } from "@/lib/onramp";

/** Configured providers, the assets each can deliver to this user, and their recent purchases. */
export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  return Response.json({
    providers: listOnrampProviders(),
    orders: await listOnrampOrders(userId),
  });
}
