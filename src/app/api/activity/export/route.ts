import type { NextRequest } from "next/server";
import { sessionUserId } from "@/lib/auth";
import { exportActivityCsv } from "@/lib/activity-center";
import type { ActivityKind } from "@/lib/activity-types";

/** CSV of everything matching the current filter. */
export async function GET(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const p = req.nextUrl.searchParams;
  const kinds = p.get("kinds")?.split(",").filter(Boolean) as ActivityKind[] | undefined;
  const csv = await exportActivityCsv(userId, {
    kinds: kinds?.length ? kinds : undefined,
    status: p.get("status") ?? undefined,
    q: p.get("q") ?? undefined,
    sort: p.get("sort") === "oldest" ? "oldest" : "newest",
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="oknexus-activity-${stamp}.csv"`,
    },
  });
}
