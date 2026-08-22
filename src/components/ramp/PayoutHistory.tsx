"use client";

import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";
import type { FiatPayoutView } from "@/lib/ramp/types";

/**
 * Recent fiat payouts.
 *
 * Polls rather than rendering once, because a payout is only confirmed by the
 * reconciler a minute or so after it is submitted — the whole point is that the
 * user watches PROCESSING become COMPLETED instead of being told to refresh.
 */
const LABELS: Record<string, { text: string; className: string }> = {
  REQUESTED: { text: "Preparing", className: "text-[var(--color-muted)]" },
  PROCESSING: { text: "In progress", className: "text-[var(--color-accent)]" },
  COMPLETED: { text: "Completed", className: "text-[var(--color-up)]" },
  FAILED: { text: "Failed · refunded", className: "text-[var(--color-down)]" },
};

function when(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PayoutHistory() {
  const { data } = usePolling(() => api.payoutHistory(), 20_000);
  const payouts: FiatPayoutView[] = data?.payouts ?? [];

  if (!payouts.length) return null;

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Bank withdrawals</h2>
      <ul className="mt-3 divide-y divide-[var(--color-border)]">
        {payouts.map((p) => {
          const label = LABELS[p.status] ?? {
            text: p.status,
            className: "text-[var(--color-muted)]",
          };
          return (
            <li key={p.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  {p.fiatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                  {p.fiatCode}
                </p>
                <p className="truncate text-xs text-[var(--color-muted)]">
                  {p.accountName ?? p.bankName} · {p.accountNumber}
                </p>
                {/* A failure already refunded the money; say so rather than
                    leaving the user wondering where it went. */}
                {p.status === "FAILED" && (
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                    {p.fromAmount} {p.fromSymbol} returned to your balance.
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className={cn("text-xs font-medium", label.className)}>{label.text}</p>
                <p className="text-xs text-[var(--color-muted)]">{when(p.createdAt)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
