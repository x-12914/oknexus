"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

interface AssetRow {
  chain: string;
  chainLabel: string;
  symbol: string;
  heldOnChain: number;
  owedToUsers: number;
  coverage: number | null;
  addressesChecked: number;
  fullyBacked: boolean;
}

interface Reserves {
  generatedAt: number;
  fullyBacked: boolean;
  assets: AssetRow[];
}

const fmt = (n: number) =>
  n === 0 ? "0" : n.toLocaleString(undefined, { maximumFractionDigits: 8 });

export function ReservesTable() {
  const [data, setData] = useState<Reserves | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // A timer rather than requestAnimationFrame: rAF never fires while a tab is
    // hidden, which would leave this on "Checking…" for anyone opening the page
    // in a background tab.
    const timer = setTimeout(() => {
      fetch("/api/proof-of-reserves", { cache: "no-store" })
        .then(async (r) => {
          if (!r.ok) throw new Error("Reserves could not be verified right now.");
          setData((await r.json()) as Reserves);
        })
        .catch((e) => setError((e as Error).message));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <p className="mt-8 rounded-2xl border border-[var(--color-down)]/30 bg-[var(--color-down-bg)] p-6 text-sm text-[var(--color-muted)]">
        {error} Rather than show a figure we could not calculate, we show nothing.
      </p>
    );
  }

  if (!data) {
    return (
      <div className="mt-8 flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-sm text-[var(--color-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking every address…
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <div
        className={
          data.fullyBacked
            ? "flex items-center gap-3 rounded-2xl border border-[var(--color-up)]/40 bg-[var(--color-up-bg)] p-5"
            : "flex items-center gap-3 rounded-2xl border border-[var(--color-down)]/40 bg-[var(--color-down-bg)] p-5"
        }
      >
        {data.fullyBacked ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-up)]" />
        ) : (
          <TriangleAlert className="h-5 w-5 shrink-0 text-[var(--color-down)]" />
        )}
        <div>
          <p className="text-sm font-semibold text-white">
            {data.fullyBacked
              ? "Customer balances are fully backed"
              : "A shortfall has been detected"}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            Checked {new Date(data.generatedAt).toUTCString()}
          </p>
        </div>
      </div>

      {data.assets.length === 0 ? (
        <p className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-muted)]">
          No customer balances are held on chain yet, so there is nothing to reconcile.
        </p>
      ) : (
        /* Its own scroll container, so a narrow screen never makes the page
           scroll sideways. */
        <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <th className="px-5 py-3 font-medium">Asset</th>
                <th className="px-5 py-3 font-medium">Network</th>
                <th className="px-5 py-3 text-right font-medium">Held</th>
                <th className="px-5 py-3 text-right font-medium">Owed</th>
                <th className="px-5 py-3 text-right font-medium">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {data.assets.map((a) => (
                <tr
                  key={`${a.chain}-${a.symbol}`}
                  className="border-b border-[var(--color-border)] last:border-0"
                >
                  <td className="px-5 py-3 font-medium text-white">{a.symbol}</td>
                  <td className="px-5 py-3 text-[var(--color-muted)]">{a.chainLabel}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-white">
                    {fmt(a.heldOnChain)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-[var(--color-muted)]">
                    {fmt(a.owedToUsers)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    <span className={a.fullyBacked ? "text-[var(--color-up)]" : "text-[var(--color-down)]"}>
                      {a.coverage === null ? "—" : `${Math.round(a.coverage * 100)}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-[var(--color-muted)]">
        Coverage shows a dash when no customer holds that asset — there is nothing to cover.
      </p>
    </div>
  );
}
