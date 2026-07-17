import { sessionUserId } from "@/lib/auth";
import { markRead } from "@/lib/notifications";

export async function POST(req: Request) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { ids?: string[] };
  await markRead(userId, Array.isArray(body.ids) ? body.ids : undefined);
  return Response.json({ ok: true });
}
