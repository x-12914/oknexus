import { sessionUserId } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications";

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ items: [], unread: 0 });
  return Response.json(await listNotifications(userId));
}
