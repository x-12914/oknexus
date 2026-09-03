import type { KycStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { KycInfo } from "@/lib/admin-types";
import { getKycProvider, kycAutomated, kycBasicAvailable } from "@/lib/kyc/index";
import { notify } from "@/lib/notifications";

/**
 * The two ways to verify.
 *
 * "full" is document + selfie (+ AML) and writes User.kycStatus, which is what
 * every fiat gate reads. "basic" is name + NIN matched against the national
 * register and writes User.kycBasicStatus, which raises the crypto withdrawal
 * cap and nothing else. They are separate columns on purpose: a basic approval
 * must never be able to satisfy a check that was written for the full one.
 */
export type KycRoute = "basic" | "full";

export async function getKyc(userId: string): Promise<KycInfo> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      kycStatus: true,
      kycBasicStatus: true,
      kycLegalName: true,
      kycCountry: true,
      kycIdNumber: true,
    },
  });
  return {
    status: u?.kycStatus ?? "NONE",
    basicStatus: u?.kycBasicStatus ?? "NONE",
    basicAvailable: kycBasicAvailable(),
    legalName: u?.kycLegalName ?? null,
    country: u?.kycCountry ?? null,
    idNumber: u?.kycIdNumber ?? null,
    automated: kycAutomated(),
  };
}

/**
 * Start a hosted verification (Didit): create a provider session, persist it
 * with the route it belongs to, mark that route PENDING, and return the hosted
 * URL for the client to redirect to.
 */
export async function startKycVerification(
  userId: string,
  route: KycRoute = "full",
): Promise<{ url: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, kycStatus: true, kycBasicStatus: true },
  });
  if (!user) throw new Error("Account not found.");
  if (user.kycStatus === "APPROVED") throw new Error("Your identity is already verified.");
  if (route === "basic") {
    if (!kycBasicAvailable()) throw new Error("Quick verification is not available right now.");
    if (user.kycBasicStatus === "APPROVED") {
      throw new Error(
        "Your details are already verified. Use full verification to unlock bank withdrawals.",
      );
    }
  }

  const provider = getKycProvider();
  const session = await provider.startVerification(
    { userId, email: user.email },
    route === "basic" ? "basic" : "advanced",
  );

  await prisma.kycSession.create({
    data: {
      userId,
      provider: provider.id,
      sessionId: session.sessionId,
      status: "PENDING",
      level: route,
    },
  });
  await prisma.user.update({
    where: { id: userId },
    data: route === "basic" ? { kycBasicStatus: "PENDING" } : { kycStatus: "PENDING" },
  });
  return { url: session.url };
}

const AML_CLEAR = new Set(["clear", "approved", "passed", "no_match", "not_found", "completed"]);

/**
 * Read the AML/sanctions outcome out of a Didit `decision`.
 *
 * Two shapes are handled because the v1 and v2 APIs differ: v1 nests an
 * `aml_screenings` array, v2 exposes a single `aml` object. "unknown" means AML
 * ran but we could not read a verdict, which must NOT be treated as clear.
 */
function amlVerdict(decision: unknown): "clear" | "hit" | "unknown" {
  const d = decision as {
    aml_screenings?: { status?: string }[];
    aml?: { status?: string; total_hits?: number };
  } | null;

  const screenings = d?.aml_screenings;
  if (Array.isArray(screenings)) {
    const statuses = screenings.map((s) => String(s?.status ?? "").toLowerCase()).filter(Boolean);
    if (statuses.length === 0) return "unknown";
    return statuses.some((st) => !AML_CLEAR.has(st)) ? "hit" : "clear";
  }

  const aml = d?.aml;
  if (aml && typeof aml === "object") {
    if (typeof aml.total_hits === "number" && aml.total_hits > 0) return "hit";
    const st = String(aml.status ?? "").toLowerCase();
    if (!st) return "unknown";
    return AML_CLEAR.has(st) ? "clear" : "hit";
  }

  return "unknown";
}

/** Whether the workflow that produced this decision included AML screening. */
function expectedAml(decision: unknown): boolean {
  const features = (decision as { features?: unknown })?.features;
  if (Array.isArray(features)) return features.some((f) => String(f).toUpperCase() === "AML");
  if (typeof features === "string") return features.toUpperCase().includes("AML");
  return false;
}

/**
 * Map a Didit session status (+ decision) onto our KycStatus. Null means leave
 * the user where they are: Abandoned, Resubmitted and anything unknown keep
 * them PENDING so they can retry.
 */
function mapDiditStatus(sessionId: string, status: string, decision: unknown): KycStatus | null {
  if (status === "Declined") return "REJECTED";
  if (status === "In Review") return "REVIEW";
  if (status !== "Approved") return null;
  // An AML result we can't read is not a clear one. If the workflow screened for
  // sanctions/PEP and we can't prove the user came back clean, send it to a human
  // rather than auto-approving them onto a live exchange.
  const aml = amlVerdict(decision);
  if (aml === "hit") return "REVIEW";
  if (aml === "unknown" && expectedAml(decision)) {
    console.warn(
      `[didit] AML ran but the verdict was unreadable (session ${sessionId}), routing to REVIEW`,
    );
    return "REVIEW";
  }
  return "APPROVED";
}

type Msg = { title: string; body: string };

const FULL_MSG: Partial<Record<KycStatus, Msg>> = {
  APPROVED: { title: "Identity verified", body: "Your identity has been verified. You're all set." },
  REJECTED: {
    title: "Identity check failed",
    body: "We couldn't verify your identity. You can try again from the Verify page.",
  },
  REVIEW: {
    title: "Identity under review",
    body: "Your verification needs a manual review. We'll update you shortly.",
  },
};

// The basic route has no reviewer behind it: a partial match is not a queue, it
// is a hint to fix the spelling or take the document route instead.
const BASIC_MSG: Partial<Record<KycStatus, Msg>> = {
  APPROVED: {
    title: "Details verified",
    body: "Your name and NIN matched the national register. Your daily limit has gone up.",
  },
  REJECTED: {
    title: "Details didn't match",
    body: "Your name and NIN didn't match the national register. Check your name is spelt exactly as registered, or verify with your ID instead.",
  },
  REVIEW: {
    title: "Details partly matched",
    body: "Your details only partly matched the register. Try again with your name exactly as registered, or verify with your ID instead.",
  },
};

/**
 * Apply a Didit webhook result to the user. The session row says which route it
 * belongs to, and only that route's status column is written. Idempotent enough
 * that redelivered webhooks just re-assert the same status.
 */
export async function applyDiditResult(
  sessionId: string,
  vendorUserId: string | undefined,
  status: string,
  decision: unknown,
): Promise<void> {
  // Record the raw provider status on our session row (a no-op if we don't have it, e.g. a test webhook).
  await prisma.kycSession.updateMany({ where: { sessionId }, data: { status } });

  // Prefer our stored session-to-user mapping over the (signed but external) vendor_data.
  const record = await prisma.kycSession.findUnique({
    where: { sessionId },
    select: { userId: true, level: true },
  });
  const userId = record?.userId ?? vendorUserId;
  if (!userId) return;
  // A session we hold no row for predates the level column, when only the full
  // route existed. Basic sessions are always recorded with their level.
  const route: KycRoute = record?.level === "basic" ? "basic" : "full";

  // Only touch a user that actually exists. A test webhook (fake vendor_data) or a
  // since-deleted account must ACK (200), not throw: a 500 makes Didit retry forever.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    console.warn(`[didit] webhook for unresolved user (session ${sessionId}), acknowledged, no-op`);
    return;
  }

  const kyc = mapDiditStatus(sessionId, status, decision);
  if (!kyc) return;

  const reviewedAt = kyc === "APPROVED" || kyc === "REJECTED" ? new Date() : undefined;
  await prisma.user.update({
    where: { id: user.id },
    data:
      route === "basic"
        ? { kycBasicStatus: kyc, ...(reviewedAt ? { kycBasicReviewedAt: reviewedAt } : {}) }
        : { kycStatus: kyc, ...(reviewedAt ? { kycReviewedAt: reviewedAt } : {}) },
  });

  const m = (route === "basic" ? BASIC_MSG : FULL_MSG)[kyc];
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
