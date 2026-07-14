import type { NextRequest } from "next/server";
import { sessionUserId } from "@/lib/auth";
import { deleteAd } from "@/lib/p2p";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  try {
    await deleteAd(userId, id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
