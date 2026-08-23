import Link from "next/link";
import { ArrowRight, PiggyBank } from "lucide-react";
import { sessionUserId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EarnView } from "@/components/earn/EarnView";
import { earnEnabled } from "@/lib/ramp/flags";

export default async function EarnPage() {
  const userId = await sessionUserId();
  if (!userId) redirect("/login");

  // Yield is currently minted rather than funded, so the product stays off
  // until it is paid from a real treasury. Existing positions can still be
  // closed through the API; only opening new ones is disabled.
  if (!earnEnabled()) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mx-auto mt-8 max-w-lg space-y-6">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-2)]">
                <PiggyBank className="h-5 w-5 text-[var(--color-accent)]" />
              </span>
              <div>
                <h1 className="text-lg font-semibold text-[var(--color-foreground)]">
                  Earn is coming back
                </h1>
                <p className="text-sm text-[var(--color-muted)]">
                  We&apos;re finalising how yield is funded.
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
              We&apos;d rather not advertise a rate we can&apos;t stand behind, so staking is paused
              while we put real reserves behind it. Any funds you had staked have been returned to
              your balance.
            </p>
          </div>

          <Link
            href="/wallet"
            className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent)]"
          >
            <span>
              <span className="block text-sm font-medium text-[var(--color-foreground)]">
                Go to your wallet
              </span>
              <span className="block text-xs text-[var(--color-muted)]">
                See your balances and recent activity.
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
          </Link>
        </div>
      </div>
    );
  }

  return <EarnView />;
}
