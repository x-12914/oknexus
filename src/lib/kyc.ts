import type { KycStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { KycInfo } from "@/lib/admin-types";
import { getKycProvider, kycAutomated } from "@/lib/kyc/index";
import { notify } from "@/lib/notifications";

export async function getKyc(userId: string): Promise<KycInfo> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycStatus: true, kycLegalName: true, kycCountry: true, kycIdNumber: true },
  });
  return {
    status: u?.kycStatus ?? "NONE",
    legalName: u?.kycLegalName ?? null,
    country: u?.kycCountry ?? null,
    idNumber: u?.kycIdNumber ?? null,
    automated: kycAutomated(),
  };
}

/**
 * Start a hosted verification (Didit): create a provider session, persist it, mark
 * the user PENDING, and return the hosted URL for the client to redirect to.
 */
export async function startKycVerification(userId: string): Promise<{ url: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, kycStatus: true },
  });
  if (!user) throw new Error("Account not found.");
  if (user.kycStatus === "APPROVED") throw new Error("Your identity is already verified.");

  const provider = getKycProvider();
  const session = await provider.startVerification({ userId, email: user.email }, "advanced");

  await prisma.kycSession.create({
    data: { userId, provider: provider.id, sessionId: session.sessionId, status: "PENDING" },
  });
  await prisma.user.update({ where: { id: userId }, data: { kycStatus: "PENDING" } });
  return { url: session.url };
}

/** Whether a Didit `decision` carries an unresolved AML/sanctions hit. */
function hasAmlHit(decision: unknown): boolean {
  const screenings = (decision as { aml_screenings?: { status?: string }[] })?.aml_screenings;
  if (!Array.isArray(screenings)) return false;
  const clear = new Set(["clear", "approved", "passed", "no_match", "not_found", "completed"]);
  return screenings.some((s) => {
    const st = String(s?.status ?? "").toLowerCase();
    return st !== "" && !clear.has(st);
  });
}

/**
 * Apply a Didit webhook result to the user's KYC status. Maps the provider status
 * (+ AML decision) onto our KycStatus, records it, and notifies the user. Idempotent
 * enough that redelivered webhooks just re-assert the same status.
 */
export async function applyDiditResult(
  sessionId: string,
  vendorUserId: string | undefined,
  status: string,
  decision: unknown,
): Promise<void> {
  // Prefer our stored session→user mapping over the (signed but external) vendor_data.
  const record = await prisma.kycSession.findUnique({
    where: { sessionId },
    select: { userId: true },
  });
  const userId = record?.userId ?? vendorUserId;
  if (!userId) return;

  let kyc: KycStatus | null = null;
  if (status === "Declined") kyc = "REJECTED";
  else if (status === "In Review") kyc = "REVIEW";
  else if (status === "Approved") kyc = hasAmlHit(decision) ? "REVIEW" : "APPROVED";
  // Abandoned / Resubmitted / unknown → leave the user PENDING so they can retry.

  await prisma.kycSession.updateMany({ where: { sessionId }, data: { status } });
  if (!kyc) return;

  const terminal = kyc === "APPROVED" || kyc === "REJECTED";
  await prisma.user.update({
    where: { id: userId },
    data: { kycStatus: kyc, ...(terminal ? { kycReviewedAt: new Date() } : {}) },
  });

  const msg: Record<string, { title: string; body: string }> = {
    APPROVED: { title: "Identity verified", body: "Your identity has been verified — you're all set." },
    REJECTED: { title: "Identity check failed", body: "We couldn't verify your identity. You can try again from the Verify page." },
    REVIEW: { title: "Identity under review", body: "Your verification needs a manual review. We'll update you shortly." },
  };
  const m = msg[kyc];
  if (m) await notify(userId, { type: "SECURITY", title: m.title, body: m.body, href: "/kyc" });
}

export interface KycSubmitInput {
  legalName: string;
  country: string;
  idNumber: string;
}

/** Submit identity details for admin review (manual KYC). */
export async function submitKyc(userId: string, input: KycSubmitInput): Promise<void> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { kycStatus: true } });
  if (u?.kycStatus === "APPROVED") throw new Error("Your identity is already verified.");
  if (!input.legalName.trim() || !input.country.trim() || !input.idNumber.trim()) {
    throw new Error("All fields are required.");
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      kycLegalName: input.legalName.trim().slice(0, 120),
      kycCountry: input.country.trim().slice(0, 60),
      kycIdNumber: input.idNumber.trim().slice(0, 60),
      kycStatus: "PENDING",
    },
  });
}
