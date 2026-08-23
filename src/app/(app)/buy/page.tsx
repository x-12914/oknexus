import Link from "next/link";
import { ArrowRight, Banknote } from "lucide-react";
import { RampCard } from "@/components/ramp/RampCard";
import { simulatedRampEnabled } from "@/lib/ramp/flags";

const ALTERNATIVES = [
  {
    href: "/deposit",
    title: "Deposit crypto",
    body: "Send crypto from another wallet or exchange to fund your account.",
  },
  {
    href: "/swap",
    title: "Swap",
    body: "Already holding something? Convert between assets at live rates.",
  },
  {
    href: "/withdraw",
    title: "Withdraw to a Nigerian bank",
    body: "Cash out to any Nigerian bank account. This part is live today.",
  },
];

export default function BuyPage() {
  // The simulated ramp credits real balances against an imaginary fiat leg, so
  // it stays off in production. Showing a working-looking form that takes no
  // payment is worse than showing nothing.
  if (simulatedRampEnabled()) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="mx-auto mt-8 max-w-md">
          <RampCard />
          <p className="mt-4 text-center text-xs leading-relaxed text-[var(--color-muted)]">
            Demo mode. No payment is taken and no real funds move.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto mt-8 max-w-lg space-y-6">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-2)]">
              <Banknote className="h-5 w-5 text-[var(--color-accent)]" />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-[var(--color-foreground)]">
                Buying with naira is on the way
              </h1>
              <p className="text-sm text-[var(--color-muted)]">
                Bank transfer deposits are being connected.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
            You&apos;ll get a dedicated Nigerian account number to transfer to, and the crypto lands
            in your wallet once the transfer clears. We&apos;re finishing the identity checks that
            Nigerian banking rules require before that can switch on.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            In the meantime
          </p>
          {ALTERNATIVES.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent)]"
            >
              <span>
                <span className="block text-sm font-medium text-[var(--color-foreground)]">
                  {a.title}
                </span>
                <span className="block text-xs text-[var(--color-muted)]">{a.body}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
