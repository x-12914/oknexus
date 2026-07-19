"use client";

import { useEffect, useState } from "react";
import { Loader2, BellRing, Trash2, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { AssetCoin } from "@/components/swap/AssetSelect";
import type { SwapAsset } from "@/lib/exchange/types";

const fmt = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: v < 1 ? 5 : 2 })}`;

export function AlertsView() {
  const { data, refresh } = usePolling(() => api.alerts(), 15000, []);
  const [assets, setAssets] = useState<SwapAsset[]>([]);
  const [symbol, setSymbol] = useState("BTC");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .swapAssets()
      .then((r) => setAssets(r.assets.filter((a) => a.symbol !== "USDT")))
      .catch(() => {});
  }, []);

  const current = assets.find((a) => a.symbol === symbol)?.usdtPrice ?? data?.prices?.[symbol];
  const targetNum = Number(target);
  const dir = current != null && targetNum > 0 ? (targetNum >= current ? "above" : "below") : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!(targetNum > 0)) {
      setError("Enter a target price.");
      return;
    }
    setBusy(true);
    try {
      await api.createAlert(symbol, targetNum);
      setTarget("");
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await api.deleteAlert(id).catch(() => {});
    refresh();
  };

  const alerts = data?.alerts ?? [];
  const active = alerts.filter((a) => !a.triggered);
  const triggered = alerts.filter((a) => a.triggered);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold">Price alerts</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Get a notification the moment an asset crosses your target price.
        </p>

        {/* Create */}
        <form onSubmit={submit} className="mt-5 rounded-2xl glass p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block sm:w-36">
              <span className="text-xs text-[var(--color-muted)]">Asset</span>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
              >
                {assets.map((a) => (
                  <option key={a.symbol} value={a.symbol}>
                    {a.symbol}
                  </option>
                ))}
              </select>
            </label>
            <label className="block flex-1">
              <span className="text-xs text-[var(--color-muted)]">
                Target price
                {current != null ? <span> · now {fmt(current)}</span> : null}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder={current != null ? current.toFixed(current < 1 ? 4 : 0) : "0"}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm tabular-nums outline-none focus:border-[var(--color-accent)]"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="btn-brand inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
              Create alert
            </button>
          </div>
          {dir ? (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
              {dir === "above" ? (
                <TrendingUp className="h-3.5 w-3.5 text-[var(--color-up)]" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-[var(--color-down)]" />
              )}
              Notifies when {symbol} goes {dir} {fmt(targetNum)}.
            </div>
          ) : null}
          {error ? <div className="mt-2 text-xs text-[var(--color-down)]">{error}</div> : null}
        </form>

        {/* Active */}
        <h2 className="mb-2 mt-6 text-sm font-semibold">Active ({active.length})</h2>
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          {active.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--color-muted)]">
              No active alerts yet.
            </div>
          ) : (
            active.map((a) => {
              const price = data?.prices?.[a.symbol];
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <AssetCoin symbol={a.symbol} size={26} />
                    <div className="min-w-0">
                      <div className="text-sm">
                        {a.symbol} {a.direction === "ABOVE" ? "≥" : "≤"}{" "}
                        <span className="font-medium tabular-nums">{fmt(a.target)}</span>
                      </div>
                      <div className="text-xs text-[var(--color-muted)]">
                        {price != null ? <>now {fmt(price)}</> : "—"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    className="rounded p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-down)]"
                    aria-label="Delete alert"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Triggered */}
        {triggered.length > 0 ? (
          <>
            <h2 className="mb-2 mt-6 text-sm font-semibold">Triggered</h2>
            <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
              {triggered.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 opacity-75 last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-up)]" />
                    <div className="min-w-0">
                      <div className="text-sm">
                        {a.symbol} {a.direction === "ABOVE" ? "went above" : "went below"}{" "}
                        <span className="tabular-nums">{fmt(a.target)}</span>
                      </div>
                      <div className="text-xs text-[var(--color-muted)]">
                        {a.triggeredAt ? new Date(a.triggeredAt).toLocaleString() : ""}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    className="rounded p-1.5 text-[var(--color-muted)] hover:text-[var(--color-down)]"
                    aria-label="Delete alert"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
