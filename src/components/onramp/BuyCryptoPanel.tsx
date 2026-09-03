"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { OnrampOrderView, OnrampProviderInfo } from "@/lib/onramp/types";

const AMOUNT_CHIPS = [20, 50, 100, 250];

const STATUS_LABEL: Record<string, string> = {
  CREATED: "Started",
  PENDING: "Awaiting payment",
  PAID: "Paid, sending crypto",
  COMPLETED: "Sent to your wallet",
  FAILED: "Didn't go through",
  EXPIRED: "Expired",
};

/**
 * Buy crypto with a card or bank transfer through a configured on-ramp.
 *
 * The provider delivers to the user's own OKNexus deposit address, so the
 * purchase shows up as a deposit once the network confirms it. Nothing here
 * credits a balance; that is the deposit scanner's job, and the reason a
 * forged callback can never mint money.
 */
export function BuyCryptoPanel() {
  const [providers, setProviders] = useState<OnrampProviderInfo[] | null>(null);
  const [orders, setOrders] = useState<OnrampOrderView[]>([]);
  const [providerId, setProviderId] = useState("");
  const [symbol, setSymbol] = useState("USDT");
  const [fiat, setFiat] = useState("NGN");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      api
        .onrampProviders()
        .then((r) => {
          setProviders(r.providers);
          setOrders(r.orders);
          const first = r.providers[0];
          if (first) {
            setProviderId(first.id);
            if (!first.assets.some((a) => a.symbol === "USDT")) setSymbol(first.assets[0]?.symbol ?? "");
            if (!first.fiats.includes("NGN")) setFiat(first.fiats[0] ?? "USD");
          }
        })
        .catch(() => setError("Couldn't load payment options."));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const provider = providers?.find((p) => p.id === providerId) ?? null;
  const amountNum = Number.parseFloat(amount);
  const amountOk = !amount || (Number.isFinite(amountNum) && amountNum > 0);

  const start = async () => {
    if (!provider) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.onrampSession({
        provider: provider.id,
        fiatCode: fiat,
        fiatAmount: amount ? amountNum : undefined,
        cryptoSymbol: symbol,
      });
      window.location.assign(r.url); // hand off to the provider's hosted checkout
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  if (error && !providers) return <p className="text-sm text-[var(--color-down)]">{error}</p>;
  if (!providers) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-[var(--color-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading payment options…
      </div>
    );
  }
  if (!provider) return null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-[var(--color-accent)]" />
          <h1 className="font-medium text-[var(--color-foreground)]">Buy crypto</h1>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
          Pay with {provider.methods.toLowerCase()}. The crypto is sent straight to your OKNexus wallet.
        </p>

        {providers.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {providers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProviderId(p.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  p.id === providerId
                    ? "bg-[var(--color-accent)] text-white"
                    : "border border-[var(--color-border)] text-[var(--color-muted)]",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-[var(--color-muted)]">You get</span>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none"
            >
              {provider.assets.map((a) => (
                <option key={`${a.symbol}-${a.chain}`} value={a.symbol}>
                  {a.symbol}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-[var(--color-muted)]">You pay in</span>
            <select
              value={fiat}
              onChange={(e) => setFiat(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none"
            >
              {provider.fiats.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 block">
          <span className="text-xs text-[var(--color-muted)]">Amount in {fiat} (optional, you can set it on the next page)</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className={cn(
              "mt-1 w-full rounded-lg border bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none",
              amountOk ? "border-[var(--color-border)]" : "border-[var(--color-down)]",
            )}
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {AMOUNT_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setAmount(String(c))}
              className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-muted)] hover:border-[var(--color-accent)]"
            >
              {c}
            </button>
          ))}
        </div>

        {error ? <p className="mt-3 text-sm text-[var(--color-down)]">{error}</p> : null}

        <button
          type="button"
          disabled={busy || !amountOk || !symbol}
          onClick={start}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
          Continue to {provider.name}
        </button>
        <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-[var(--color-muted)]">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Your card details go to {provider.name}, never to us. Your wallet address is fixed in the
            checkout, and the purchase appears as a deposit once the network confirms it.
          </span>
        </p>
      </div>

      {orders.length > 0 && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-sm font-medium text-[var(--color-foreground)]">Recent purchases</h2>
          <ul className="mt-3 divide-y divide-[var(--color-border)]">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block text-[var(--color-foreground)]">
                    {o.cryptoAmount ? `${o.cryptoAmount} ` : ""}
                    {o.cryptoSymbol}
                    {o.fiatAmount ? ` for ${o.fiatAmount.toLocaleString()} ${o.fiatCode}` : ""}
                  </span>
                  <span className="block truncate text-xs text-[var(--color-muted)]">
                    {new Date(o.createdAt).toLocaleString()} · {o.provider}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-xs",
                    o.status === "COMPLETED"
                      ? "text-[var(--color-up)]"
                      : o.status === "FAILED" || o.status === "EXPIRED"
                        ? "text-[var(--color-down)]"
                        : "text-amber-500",
                  )}
                >
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
