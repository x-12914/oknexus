import type { NextRequest } from "next/server";
import { sessionUserId } from "@/lib/auth";
import { listActivity } from "@/lib/activity-center";
import type { ActivityKind } from "@/lib/activity-types";

export async function GET(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ records: [], total: 0 });

  const p = req.nextUrl.searchParams;
  const kinds = p.get("kinds")?.split(",").filter(Boolean) as ActivityKind[] | undefined;
  const num = (k: string) => (p.get(k) ? Number(p.get(k)) : undefined);

  return Response.json(
    await listActivity(userId, {
      kinds: kinds?.length ? kinds : undefined,
      status: p.get("status") ?? undefined,
      q: p.get("q") ?? undefined,
      from: num("from"),
      to: num("to"),
      sort: p.get("sort") === "oldest" ? "oldest" : "newest",
      limit: num("limit") ?? 50,
      offset: num("offset") ?? 0,
    }),
  );
}
