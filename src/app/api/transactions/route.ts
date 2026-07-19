import { sessionUserId } from "@/lib/auth";
import { getActivity } from "@/lib/activity";

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ activity: [] });
  const activity = await getActivity(userId);
  return Response.json({ activity });
}
