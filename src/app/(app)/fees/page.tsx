import { redirect } from "next/navigation";
import { sessionUserId } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  VIP_TIERS,
  SWAP_PCT,
  RAMP_PCT,
  P2P_PCT,
  OKN_DISCOUNT_PCT,
  WITHDRAWAL_MARGIN_PCT,
  getFeeProfile,
  oknDiscountEnabled,
} from "@/lib/fees";

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
const usd = (v: number) =>
  `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default async function FeesPage() {
  const userId = await sessionUserId();
  if (!userId) redirect("/login");

  // Rendered server-side: the tier is derived from the same function that
  // charges the fee, so the page can't drift from what settlement actually does.
  const profile = await getFeeProfile(userId);
  const okn = oknDiscountEnabled();

  const progress = profile.nextTier
    ? Math.min(100, (profile.volumeUsd / profile.nextTier.tier.minVolumeUsd) * 100)
    : 100;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Fees</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Trade more and you pay less. Your rate is based on the last 30 days.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Your tier</p>
              <p className="text-2xl font-semibold text-[var(--color-foreground)]">
                {profile.tier.label}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
                Your trading fee
              </p>
              <p className="text-2xl font-semibold text-[var(--color-accent)]">
                {pct(profile.takerPct)}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-xs text-[var(--color-muted)]">
              <span>30-day volume: {usd(profile.volumeUsd)}</span>
              {profile.nextTier ? (
                <span>
                  {usd(profile.nextTier.volumeToGoUsd)} more for{" "}
                  {profile.nextTier.tier.label} at {pct(profile.nextTier.tier.tradingPct)}
                </span>
              ) : (
                <span>Top tier</span>
              )}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {okn && (
            <p className="mt-4 text-xs text-[var(--color-up)]">
              Includes your {pct(OKN_DISCOUNT_PCT)} discount for paying fees in OKN.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Trading tiers</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                  <th className="pb-2 font-medium">Tier</th>
                  <th className="pb-2 font-medium">30-day volume</th>
                  <th className="pb-2 text-right font-medium">Fee</th>
                </tr>
              </thead>
              <tbody>
                {VIP_TIERS.map((t) => {
                  const current = t.id === profile.tier.id;
                  return (
                    <tr
                      key={t.id}
                      className={cn(
                        "border-t border-[var(--color-border)]",
                        current && "bg-[var(--color-surface-2)]",
                      )}
                    >
                      <td className="py-2.5 font-medium text-[var(--color-foreground)]">
                        {t.label}
                        {current && (
                          <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--color-accent)]">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-[var(--color-muted)]">
                        {t.maxVolumeUsd
                          ? `${usd(t.minVolumeUsd)} – ${usd(t.maxVolumeUsd)}`
                          : `${usd(t.minVolumeUsd)}+`}
                      </td>
                      <td className="py-2.5 text-right font-medium text-[var(--color-foreground)]">
                        {pct(t.tradingPct)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Volume counts spot trades and swaps. Deposits and withdrawals aren&apos;t trading, so
            they don&apos;t count toward your tier.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Everything else</h2>
          <dl className="mt-3 divide-y divide-[var(--color-border)] text-sm">
            {[
              ["Crypto deposit", "Free", "We don't charge to receive crypto."],
              ["Swap / convert", pct(SWAP_PCT), "Taken from the asset you receive."],
              ["Buy & sell", pct(RAMP_PCT), "On top of the payment provider's own rate."],
              ["P2P trading", pct(P2P_PCT), "Charged on completed trades."],
              [
                "Crypto withdrawal",
                "Network cost",
                // Being straight about this beats quoting a flat number that
                // stops being true the next time the network gets busy.
                `Measured live per network, plus ${pct(WITHDRAWAL_MARGIN_PCT)}. Shown before you confirm.`,
              ],
            ].map(([label, value, note]) => (
              <div key={label} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <dt className="font-medium text-[var(--color-foreground)]">{label}</dt>
                  <dd className="text-xs text-[var(--color-muted)]">{note}</dd>
                </div>
                <span className="shrink-0 font-semibold text-[var(--color-foreground)]">
                  {value}
                </span>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
