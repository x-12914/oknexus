import { sessionUserId } from "@/lib/auth";
import { listMyAds } from "@/lib/p2p";

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ ads: [] });
  const ads = await listMyAds(userId);
  return Response.json({ ads });
}
