"use client";

import Link from "next/link";
import { Loader2, ArrowLeftRight, CreditCard, Lock, Download, Upload } from "lucide-react";
import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { cn } from "@/lib/utils";
import { AssetCoin } from "@/components/swap/AssetSelect";

function fmtUsd(v: number): string {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtQty(v: number): string {
  const d = v >= 1000 ? 2 : v >= 1 ? 4 : 8;
  return v.toLocaleString(undefined, { maximumFractionDigits: d });
}

const TYPE_LABEL: Record<string, string> = {
  SEED: "Welcome bonus",
  SWAP: "Swap",
  RAMP: "Buy/Sell",
  SPOT: "Spot trade",
  OTC: "OTC block",
  P2P: "P2P trade",
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  ADJUSTMENT: "Adjustment",
};

export function WalletView() {
  const { data } = usePolling(() => api.wallet(), 8000, []);
  const { data: tx } = usePolling(() => api.transactions(), 8000, []);
  const activity = tx?.activity ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold">Wallet</h1>
        <div className="flex flex-wrap justify-end gap-2">
          <Link
            href="/deposit"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-surface-2)]"
          >
            <Download className="h-4 w-4" /> Deposit
          </Link>
          <Link
            href="/withdraw"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-surface-2)]"
          >
            <Upload className="h-4 w-4" /> Withdraw
          </Link>
          <Link
            href="/buy"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-surface-2)]"
          >
            <CreditCard className="h-4 w-4" /> Buy
          </Link>
          <Link
            href="/swap"
            className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
          >
            <ArrowLeftRight className="h-4 w-4" /> Swap
          </Link>
        </div>
      </div>

      {/* Total */}
      <div className="rounded-2xl glass p-5 mb-5">
        <div className="text-sm text-[var(--color-muted)]">Estimated total value</div>
        <div className="mt-1 text-3xl font-semibold tabular-nums">
          {data ? fmtUsd(data.totalUsd) : "—"}
        </div>
        <div className="mt-1 text-xs text-[var(--color-muted)]">
          Demo balances · valued at live market prices
        </div>
      </div>

      {/* Assets */}
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-3 px-4 py-2 text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <span>Asset</span>
          <span className="text-right">Balance</span>
          <span className="text-right">Value</span>
          <span className="text-right">Allocation</span>
        </div>

        {!data ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[var(--color-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading balances…
          </div>
        ) : (
          data.items.map((it) => {
            const alloc = data.totalUsd > 0 ? (it.usdValue / data.totalUsd) * 100 : 0;
            return (
              <div
                key={it.symbol}
                className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-3 px-4 py-3 border-b border-[var(--color-border)] last:border-0 items-center"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AssetCoin symbol={it.symbol} size={32} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{it.symbol}</div>
                    <div className="text-xs text-[var(--color-muted)] truncate">{it.name}</div>
                  </div>
                </div>
                <div className="text-right tabular-nums text-sm">
                  <div>{fmtQty(it.balance)}</div>
                  {it.locked > 0 ? (
                    <div className="flex items-center justify-end gap-1 text-xs text-[var(--color-muted)]">
                      <Lock className="h-3 w-3" /> {fmtQty(it.locked)} locked
                    </div>
                  ) : null}
                  <div className="text-xs text-[var(--color-muted)] sm:hidden">
                    {fmtUsd(it.usdValue)}
                  </div>
                </div>
                <div className="hidden sm:block text-right tabular-nums text-sm">
                  {fmtUsd(it.usdValue)}
                </div>
                <div className="hidden sm:flex items-center justify-end gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                    <div
                      className={cn("h-full rounded-full bg-[var(--color-accent)]")}
                      style={{ width: `${Math.min(100, alloc)}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--color-muted)] tabular-nums w-10 text-right">
                    {alloc.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Recent activity */}
      <h2 className="text-sm font-semibold mt-6 mb-2">Recent activity</h2>
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        {!tx ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[var(--color-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : activity.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--color-muted)]">
            No transactions yet. Swap, trade or buy to see your ledger here.
          </div>
        ) : (
          activity.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--color-border)] last:border-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AssetCoin symbol={a.symbol} size={26} />
                <div className="min-w-0">
                  <div className="text-sm truncate">{a.memo ?? TYPE_LABEL[a.type] ?? a.type}</div>
                  <div className="text-xs text-[var(--color-muted)]">
                    {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  "text-sm tabular-nums whitespace-nowrap",
                  a.delta >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]",
                )}
              >
                {a.delta >= 0 ? "+" : "−"}
                {fmtQty(Math.abs(a.delta))} {a.symbol}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
