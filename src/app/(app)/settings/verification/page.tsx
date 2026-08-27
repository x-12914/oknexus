import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, Lock } from "lucide-react";
import { sessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TIERS, tierFor } from "@/lib/limits";
import { dailyLimitStatus } from "@/lib/custody/withdrawals";
import { cn } from "@/lib/utils";

const usd = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default async function VerificationPage() {
  const userId = await sessionUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kycStatus: true },
  });
  const current = tierFor(user?.kycStatus ?? "NONE");
  const limit = await dailyLimitStatus(userId);
  const usedPct = limit.limitUsd > 0 ? Math.min(100, (limit.usedUsd / limit.limitUsd) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
            Verification &amp; limits
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            What you can do today, and what verifying unlocks.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
                Your level
              </p>
              <p className="text-2xl font-semibold text-[var(--color-foreground)]">
                {current.label}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
                Daily withdrawal limit
              </p>
              <p className="text-2xl font-semibold text-[var(--color-accent)]">
                {usd(current.dailyWithdrawUsd)}
              </p>
            </div>
          </div>

          {/* Rolling 24h rather than calendar-day, which is what's enforced. */}
          <div className="mt-5">
            <div className="flex justify-between text-xs text-[var(--color-muted)]">
              <span>{usd(limit.usedUsd)} used in the last 24 hours</span>
              <span>{usd(limit.remainingUsd)} left</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)]"
                style={{ width: `${usedPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {TIERS.map((t) => {
            const active = t.id === current.id;
            const reached = TIERS.indexOf(t) <= TIERS.indexOf(current);
            return (
              <div
                key={t.id}
                className={cn(
                  "rounded-2xl border p-5",
                  active
                    ? "border-[var(--color-accent)] bg-[var(--color-surface)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                    {t.label}
                  </h2>
                  {active ? (
                    <span className="rounded-full bg-[var(--color-up-bg)] px-2 py-0.5 text-xs font-medium text-[var(--color-up)]">
                      Current
                    </span>
                  ) : reached ? null : (
                    <Lock className="h-4 w-4 text-[var(--color-muted)]" />
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{t.requirement}</p>
                <ul className="mt-3 space-y-1.5">
                  {t.perks.map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-2 text-sm text-[var(--color-muted)]"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-up)]" />
                      {p}
                    </li>
                  ))}
                  <li className="flex items-start gap-2 text-sm text-[var(--color-muted)]">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-up)]" />
                    {usd(t.dailyWithdrawUsd)} a day
                  </li>
                </ul>
                {!active && !reached && (
                  <Link
                    href="/kyc"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] hover:underline"
                  >
                    Verify my identity <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
