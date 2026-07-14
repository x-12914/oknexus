import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  setUserSuspended,
  setUserRole,
  setUserKyc,
  resolveDispute,
  adminDeactivateAd,
} from "@/lib/admin";

const Schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("suspend"), userId: z.string(), value: z.boolean() }),
  z.object({ type: z.literal("role"), userId: z.string(), value: z.enum(["USER", "ADMIN", "SUPPORT"]) }),
  z.object({
    type: z.literal("kyc"),
    userId: z.string(),
    value: z.enum(["NONE", "PENDING", "APPROVED", "REJECTED"]),
  }),
  z.object({ type: z.literal("dispute"), orderId: z.string(), value: z.enum(["release", "refund"]) }),
  z.object({ type: z.literal("deactivateAd"), adId: z.string() }),
]);

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return Response.json({ error: "Forbidden" }, { status: 403 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const d = parsed.data;

  try {
    switch (d.type) {
      case "suspend":
        await setUserSuspended(d.userId, d.value);
        break;
      case "role":
        await setUserRole(d.userId, d.value);
        break;
      case "kyc":
        await setUserKyc(d.userId, d.value);
        break;
      case "dispute":
        await resolveDispute(d.orderId, d.value);
        break;
      case "deactivateAd":
        await adminDeactivateAd(d.adId);
        break;
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
