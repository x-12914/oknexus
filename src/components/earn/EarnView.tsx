"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { cn } from "@/lib/utils";
import { AssetCoin } from "@/components/swap/AssetSelect";
import type { EarnProduct, StakeView } from "@/lib/earn-types";

const YEAR = 365.25 * 24 * 3600;
const usd = (v: number) =>
  `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qty = (v: number, dp = 6) => v.toLocaleString(undefined, { maximumFractionDigits: dp });

export function EarnView() {
  const { data, refresh } = usePolling(() => api.earn(), 10000, []);
  const { data: wallet } = usePolling(() => api.wallet(), 10000, []);

  // Extrapolate accrued rewards between polls so they visibly tick up.
  const fetchedAt = useRef(Date.now());
  const [, setTick] = useState(0);
  useEffect(() => {
    fetchedAt.current = Date.now();
  }, [data]);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-[var(--color-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading earn…
      </div>
    );
  }

  const priceOf = (s: string) => data.prices[s] ?? 0;
  const balanceOf = (s: string) => wallet?.items.find((i) => i.symbol === s)?.balance ?? 0;
  const liveAccrued = (p: StakeView) =>
    p.accrued + (p.principal * (p.apy / 100) * ((Date.now() - fetchedAt.current) / 1000)) / YEAR;

  const totalStakedUsd = data.positions.reduce((s, p) => s + p.principal * priceOf(p.symbol), 0);
  const totalRewardUsd = data.positions.reduce((s, p) => s + liveAccrued(p) * priceOf(p.symbol), 0);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-semibold">Earn</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Put idle assets to work. Rewards accrue every minute — unstake anytime.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Total staked" value={usd(totalStakedUsd)} />
          <Stat label="Rewards earned" value={usd(totalRewardUsd)} tone="up" />
        </div>

        <h2 className="mb-2 mt-6 text-sm font-semibold">Staking products</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.products.map((p) => (
            <ProductCard
              key={p.symbol}
              product={p}
              balance={balanceOf(p.symbol)}
              onStaked={refresh}
            />
          ))}
        </div>

        <h2 className="mb-2 mt-6 text-sm font-semibold">Your stakes ({data.positions.length})</h2>
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          {data.positions.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--color-muted)]">
              You&apos;re not staking anything yet.
            </div>
          ) : (
            data.positions.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <AssetCoin symbol={p.symbol} size={26} />
                  <div className="min-w-0">
                    <div className="text-sm">
                      {qty(p.principal)} {p.symbol}
                      <span className="text-[var(--color-muted)]"> · {p.apy}% APY</span>
                    </div>
                    <div className="text-xs tabular-nums text-[var(--color-up)]">
                      +{qty(liveAccrued(p), 8)} {p.symbol} earned
                    </div>
                  </div>
                </div>
                <UnstakeButton id={p.id} onDone={refresh} />
              </div>
            ))
          )}
        </div>

        <p className="mt-4 text-center text-[10px] text-[var(--color-muted)]">
          Flexible staking · demo yield credited from the platform treasury.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">{label}</div>
      <div
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          tone === "up" && "text-[var(--color-up)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  balance,
  onStaked,
}: {
  product: EarnProduct;
  balance: number;
  onStaked: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amt = Number(amount);
  const insufficient = amt > balance;

  const submit = async () => {
    setError(null);
    if (!(amt > 0)) {
      setError("Enter an amount.");
      return;
    }
    setBusy(true);
    try {
      await api.stake(product.symbol, amt);
      setAmount("");
      onStaked();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl glass p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AssetCoin symbol={product.symbol} size={28} />
          <div>
            <div className="text-sm font-medium">{product.symbol}</div>
            <div className="text-xs text-[var(--color-muted)]">{product.name}</div>
          </div>
        </div>
        <div className="rounded-full bg-[var(--color-up)]/12 px-2.5 py-1 text-sm font-semibold text-[var(--color-up)]">
          {product.apy}% APY
        </div>
      </div>

      <div className="mt-3 flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] focus-within:border-[var(--color-accent)]">
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0.0"
          className={cn(
            "min-w-0 flex-1 bg-transparent px-3 py-2 text-sm tabular-nums outline-none",
            insufficient && "text-[var(--color-down)]",
          )}
        />
        <button
          type="button"
          onClick={() => setAmount(String(balance))}
          className="px-2 text-xs text-[var(--color-accent)] hover:underline"
        >
          Max
        </button>
        <span className="px-2 text-xs text-[var(--color-muted)]">{product.symbol}</span>
      </div>
      <div className="mt-1 text-[10px] text-[var(--color-muted)]">
        Available: {qty(balance)} {product.symbol}
      </div>
      {error ? <div className="mt-1 text-xs text-[var(--color-down)]">{error}</div> : null}

      <button
        type="button"
        onClick={submit}
        disabled={busy || insufficient}
        className={cn(
          "mt-2 w-full rounded-lg py-2 text-sm font-medium",
          busy || insufficient
            ? "cursor-not-allowed bg-[var(--color-surface-2)] text-[var(--color-muted)]"
            : "btn-brand",
        )}
      >
        {busy ? "Staking…" : insufficient ? `Insufficient ${product.symbol}` : "Stake"}
      </button>
    </div>
  );
}

function UnstakeButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await api.unstake(id);
      onDone();
    } catch {
      // surfaced via the list refresh; keep the button simple
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className="shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-surface-2)] disabled:opacity-60"
    >
      {busy ? "…" : "Unstake"}
    </button>
  );
}
