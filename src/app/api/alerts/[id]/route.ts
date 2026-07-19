import type { NextRequest } from "next/server";
import { sessionUserId } from "@/lib/auth";
import { deleteAlert } from "@/lib/price-alerts";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/alerts/[id]">) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });

  const { id } = await ctx.params;
  await deleteAlert(userId, id);
  return Response.json({ ok: true });
}
