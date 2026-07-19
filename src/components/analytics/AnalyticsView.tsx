"use client";

import { Loader2, Download } from "lucide-react";
import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { cn } from "@/lib/utils";
import { AssetCoin } from "@/components/swap/AssetSelect";
import type { TypeStat } from "@/lib/analytics-types";

const usd = (v: number, dp = 2) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
const usd0 = (v: number) => `$${Math.round(v).toLocaleString()}`;
const signedUsd = (v: number) => `${v >= 0 ? "+" : "−"}${usd(Math.abs(v))}`;

const TYPE_LABEL: Record<string, string> = {
  SEED: "Welcome bonus",
  SWAP: "Swaps",
  RAMP: "Buy / Sell",
  SPOT: "Spot trades",
  OTC: "OTC blocks",
  P2P: "P2P trades",
  DEPOSIT: "Deposits",
  WITHDRAWAL: "Withdrawals",
  TRANSFER: "Transfers",
  ADJUSTMENT: "Adjustments",
};

export function AnalyticsView() {
  const { data } = usePolling(() => api.analytics(), 30000, []);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-[var(--color-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Crunching your numbers…
      </div>
    );
  }

  const up = data.change24hUsd >= 0;
  const maxVol = Math.max(1, ...data.volumeSeries.map((p) => p.volumeUsd));
  const maxNet = Math.max(1, ...data.byType.map((t) => Math.abs(t.netUsd)));
  const series30 = data.volumeSeries.reduce((s, p) => s + p.volumeUsd, 0);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Analytics</h1>
            <p className="text-sm text-[var(--color-muted)]">Your portfolio and trading activity.</p>
          </div>
          <a
            href="/api/analytics/export"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-surface-2)]"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Portfolio value" value={usd(data.totalUsd)} />
          <Stat
            label="24h change"
            value={`${up ? "+" : "−"}${Math.abs(data.change24hPct).toFixed(2)}%`}
            sub={signedUsd(data.change24hUsd)}
            tone={up ? "up" : "down"}
          />
          <Stat label="Trades" value={data.totals.trades.toLocaleString()} />
          <Stat label="Volume" value={usd0(data.totals.volumeUsd)} />
          <Stat label="Fees paid" value={usd(data.totals.feesUsd)} />
        </div>

        {/* Allocation + activity */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Allocation">
            {data.assets.length === 0 ? (
              <Empty>No holdings yet.</Empty>
            ) : (
              <div className="space-y-2.5">
                {data.assets.map((a) => (
                  <div key={a.symbol}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <AssetCoin symbol={a.symbol} size={20} />
                        <span className="font-medium">{a.symbol}</span>
                        <span className="text-xs text-[var(--color-muted)]">{a.pct.toFixed(1)}%</span>
                      </span>
                      <span className="tabular-nums">{usd(a.usdValue)}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-accent)]"
                        style={{ width: `${Math.min(100, a.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Activity by type">
            {data.byType.length === 0 ? (
              <Empty>No activity yet.</Empty>
            ) : (
              <div className="space-y-2">
                {data.byType.map((t) => (
                  <TypeRow key={t.type} stat={t} maxNet={maxNet} />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Volume over time */}
        <Card title="Trading volume · last 30 days" className="mt-4">
          {series30 === 0 ? (
            <Empty>No trades in the last 30 days.</Empty>
          ) : (
            <>
              <div className="flex h-32 items-end gap-[3px]">
                {data.volumeSeries.map((p) => (
                  <div
                    key={p.date}
                    className="group flex-1"
                    title={`${p.date}: ${usd0(p.volumeUsd)}`}
                  >
                    <div
                      className="w-full rounded-sm bg-[var(--color-accent)]/70 transition-colors group-hover:bg-[var(--color-accent)]"
                      style={{ height: `${Math.max(2, (p.volumeUsd / maxVol) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-[var(--color-muted)]">
                <span>{data.volumeSeries[0]?.date}</span>
                <span>Today</span>
              </div>
            </>
          )}
        </Card>

        <p className="mt-4 text-center text-[10px] text-[var(--color-muted)]">
          Values use live market prices · updated {new Date(data.generatedAt).toLocaleTimeString()}.
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">{label}</div>
      <div
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          tone === "up" && "text-[var(--color-up)]",
          tone === "down" && "text-[var(--color-down)]",
        )}
      >
        {value}
      </div>
      {sub ? <div className="text-xs tabular-nums text-[var(--color-muted)]">{sub}</div> : null}
    </div>
  );
}

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl glass p-5", className)}>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-8 text-center text-sm text-[var(--color-muted)]">{children}</div>;
}

function TypeRow({ stat, maxNet }: { stat: TypeStat; maxNet: number }) {
  const pos = stat.netUsd >= 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-28 shrink-0">
        <div className="font-medium">{TYPE_LABEL[stat.type] ?? stat.type}</div>
        <div className="text-[10px] text-[var(--color-muted)]">
          {stat.count} {stat.count === 1 ? "entry" : "entries"}
        </div>
      </div>
      <div className="flex-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
          <div
            className={cn("h-full rounded-full", pos ? "bg-[var(--color-up)]" : "bg-[var(--color-down)]")}
            style={{ width: `${Math.min(100, (Math.abs(stat.netUsd) / maxNet) * 100)}%` }}
          />
        </div>
      </div>
      <div
        className={cn(
          "w-20 shrink-0 text-right text-xs tabular-nums",
          pos ? "text-[var(--color-up)]" : "text-[var(--color-down)]",
        )}
      >
        {signedUsd(stat.netUsd)}
      </div>
    </div>
  );
}
