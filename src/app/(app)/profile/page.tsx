import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, ShieldCheck, ShieldAlert } from "lucide-react";
import { sessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFeeProfile } from "@/lib/fees";
import { ProfileNameCard } from "@/components/profile/ProfileNameCard";
import { cn } from "@/lib/utils";

const KYC_COPY: Record<string, { label: string; tone: "good" | "warn" | "bad" }> = {
  APPROVED: { label: "Verified", tone: "good" },
  PENDING: { label: "In progress", tone: "warn" },
  REVIEW: { label: "Under review", tone: "warn" },
  REJECTED: { label: "Rejected", tone: "bad" },
  NONE: { label: "Not started", tone: "warn" },
};

const LINKS = [
  { href: "/settings/security", label: "Security", desc: "Password, 2FA, sessions, whitelist" },
  { href: "/settings/payment-methods", label: "Payment methods", desc: "Banks and cards" },
  { href: "/settings/notifications", label: "Notifications", desc: "What we tell you about" },
  { href: "/fees", label: "Fees & tier", desc: "Your rate and trading volume" },
];

export default async function ProfilePage() {
  const userId = await sessionUserId();
  if (!userId) redirect("/login");

  const [user, fees] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        role: true,
        kycStatus: true,
        kycBasicStatus: true,
        twoFAEnabled: true,
        emailVerified: true,
        createdAt: true,
      },
    }),
    getFeeProfile(userId),
  ]);
  if (!user) redirect("/login");

  // A Basic (NIN register) approval earns the green badge, but the copy below
  // still says what it does not unlock.
  const kyc =
    user.kycStatus !== "APPROVED" && user.kycBasicStatus === "APPROVED"
      ? { label: "Basic", tone: "good" as const }
      : (KYC_COPY[user.kycStatus] ?? KYC_COPY.NONE);
  const initials = (user.name || user.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-lg font-semibold text-[var(--color-accent)]">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-[var(--color-foreground)]">
              {user.name || user.email}
            </h1>
            <p className="text-sm text-[var(--color-muted)]">
              {fees.tier.label} tier · member since{" "}
              {user.createdAt.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Account</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ProfileNameCard initialName={user.name} />
            <div>
              <div className="text-xs text-[var(--color-muted)]">Email</div>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[var(--color-foreground)]">
                <span className="truncate">{user.email}</span>
                {user.emailVerified && (
                  <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--color-muted)]">Role</div>
              <div className="mt-1 text-sm font-medium text-[var(--color-foreground)]">
                {user.role}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--color-muted)]">Joined</div>
              <div className="mt-1 text-sm font-medium text-[var(--color-foreground)]">
                {user.createdAt.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Identity and 2FA are surfaced together: they're the two things that
            decide whether money can leave the account. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Identity</h2>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  kyc.tone === "good" && "bg-[var(--color-up-bg)] text-[var(--color-up)]",
                  kyc.tone === "warn" && "bg-[var(--color-surface-2)] text-[var(--color-muted)]",
                  kyc.tone === "bad" && "bg-[var(--color-down-bg)] text-[var(--color-down)]",
                )}
              >
                {kyc.label}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
              {user.kycStatus === "APPROVED"
                ? "You can withdraw to a bank account."
                : user.kycBasicStatus === "APPROVED"
                  ? "Your details are verified. Verify with your ID to withdraw to a bank account."
                  : "Verifying your identity is required before withdrawing to a bank account."}
            </p>
            {user.kycStatus !== "APPROVED" && (
              <Link
                href="/kyc"
                className="mt-3 inline-block text-sm font-medium text-[var(--color-accent)] hover:underline"
              >
                Verify now
              </Link>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                Two-factor auth
              </h2>
              {user.twoFAEnabled ? (
                <ShieldCheck className="h-4 w-4 text-[var(--color-up)]" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-[var(--color-muted)]" />
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
              {user.twoFAEnabled
                ? "On. Withdrawals need a code from your authenticator."
                : "Off. Turning it on is the single best protection for your balance."}
            </p>
            <Link
              href="/settings/security"
              className="mt-3 inline-block text-sm font-medium text-[var(--color-accent)] hover:underline"
            >
              {user.twoFAEnabled ? "Manage" : "Turn on"}
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent)]"
            >
              <span>
                <span className="block text-sm font-medium text-[var(--color-foreground)]">
                  {l.label}
                </span>
                <span className="block text-xs text-[var(--color-muted)]">{l.desc}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
