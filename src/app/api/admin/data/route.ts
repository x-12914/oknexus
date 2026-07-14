import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getOverview,
  listUsers,
  listDisputes,
  listRecentLedger,
  listAllAds,
} from "@/lib/admin";

export async function GET(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return Response.json({ error: "Forbidden" }, { status: 403 });

  switch (req.nextUrl.searchParams.get("view")) {
    case "overview":
      return Response.json(await getOverview());
    case "users":
      return Response.json({ users: await listUsers() });
    case "disputes":
      return Response.json({ disputes: await listDisputes() });
    case "ledger":
      return Response.json({ rows: await listRecentLedger() });
    case "ads":
      return Response.json({ ads: await listAllAds() });
    default:
      return Response.json({ error: "Unknown view" }, { status: 400 });
  }
}
