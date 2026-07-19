import { sessionUserId } from "@/lib/auth";
import { getAnalytics } from "@/lib/analytics";

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  return Response.json(await getAnalytics(userId));
}
