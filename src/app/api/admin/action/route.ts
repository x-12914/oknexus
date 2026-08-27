import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import {
  setUserSuspended,
  setUserRole,
  setUserKyc,
  resolveDispute,
  adminDeactivateAd,
} from "@/lib/admin";
import { approveWithdrawal, rejectWithdrawal, ApprovalError } from "@/lib/custody/withdrawals";

const Schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("suspend"), userId: z.string(), value: z.boolean() }),
  z.object({ type: z.literal("role"), userId: z.string(), value: z.enum(["USER", "ADMIN", "SUPPORT"]) }),
  z.object({
    type: z.literal("kyc"),
    userId: z.string(),
    value: z.enum(["NONE", "PENDING", "APPROVED", "REJECTED", "REVIEW"]),
  }),
  z.object({ type: z.literal("dispute"), orderId: z.string(), value: z.enum(["release", "refund"]) }),
  z.object({ type: z.literal("deactivateAd"), adId: z.string() }),
  z.object({ type: z.literal("approveWithdrawal"), withdrawalId: z.string() }),
  z.object({
    type: z.literal("rejectWithdrawal"),
    withdrawalId: z.string(),
    reason: z.string().min(3).max(300),
  }),
]);

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return Response.json({ error: "Forbidden" }, { status: 403 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const d = parsed.data;

  const actor = await prisma.user.findUnique({
    where: { id: adminId },
    select: { email: true },
  });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

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
      case "approveWithdrawal":
        await approveWithdrawal(d.withdrawalId, adminId);
        break;
      case "rejectWithdrawal":
        await rejectWithdrawal(d.withdrawalId, adminId, d.reason);
        break;
    }

    // Logged after success, so the trail records what actually happened rather
    // than what was attempted. Failures are recorded separately below.
    await audit({
      actorId: adminId,
      actorEmail: actor?.email ?? null,
      action: d.type,
      targetType:
        "userId" in d ? "user" : "orderId" in d ? "p2pOrder" : "adId" in d ? "p2pAd" : "withdrawal",
      targetId:
        "userId" in d
          ? d.userId
          : "orderId" in d
            ? d.orderId
            : "adId" in d
              ? d.adId
              : d.withdrawalId,
      metadata: d as unknown as Record<string, unknown>,
      ip,
    });
    return Response.json({ ok: true });
  } catch (e) {
    const message = (e as Error).message;
    // A refused privileged action is worth recording too — a run of rejected
    // approvals is exactly the pattern an audit trail exists to surface.
    await audit({
      actorId: adminId,
      actorEmail: actor?.email ?? null,
      action: `${d.type}:failed`,
      metadata: { error: message },
      ip,
    });
    const status = e instanceof ApprovalError ? 409 : 400;
    return Response.json({ error: message }, { status });
  }
}
