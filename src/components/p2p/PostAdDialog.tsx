"use client";

import { useEffect, useState } from "react";
import { X, Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { OrderSide, P2PPaymentMethod } from "@/lib/exchange/types";
import { AssetCoin } from "@/components/swap/AssetSelect";

const ASSETS = ["USDT", "BTC", "ETH", "SOL", "BNB"];
const FIATS = ["USD", "NGN", "EUR", "GBP"];

function num(v: string): string {
  return v.replace(/[^0-9.]/g, "");
}

export function PostAdDialog({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const [methods, setMethods] = useState<P2PPaymentMethod[]>([]);
  const [balances, setBalances] = useState<Record<string, number> | null>(null);

  const [side, setSide] = useState<OrderSide>("SELL");
  const [asset, setAsset] = useState("USDT");
  const [fiat, setFiat] = useState("USD");
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState("");
  const [minLimit, setMinLimit] = useState("");
  const [maxLimit, setMaxLimit] = useState("");
  const [selMethods, setSelMethods] = useState<string[]>([]);
  const [terms, setTerms] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.p2pPaymentMethods().then((r) => setMethods(r.methods)).catch(() => {});
    api
      .wallet()
      .then((p) => setBalances(Object.fromEntries(p.items.map((i) => [i.symbol, i.balance]))))
      .catch(() => setBalances(null));
  }, []);

  const balance = balances?.[asset] ?? 0;
  const availNum = Number(available);
  const isSell = side === "SELL";
  const sellNeedsBalance = isSell && balances != null && availNum > balance;
  const toggleMethod = (id: string) =>
    setSelMethods((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const valid =
    Number(price) > 0 &&
    availNum > 0 &&
    Number(minLimit) > 0 &&
    Number(maxLimit) >= Number(minLimit) &&
    selMethods.length > 0 &&
    !sellNeedsBalance;

  const submit = async () => {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.p2pCreateAd({
        side,
        asset,
        fiat,
        price: Number(price),
        available: availNum,
        minLimit: Number(minLimit),
        maxLimit: Number(maxLimit),
        paymentMethods: selMethods,
        terms: terms.trim() || undefined,
      });
      onPosted();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  };

  const pill = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-sm",
      active
        ? "border-[var(--color-accent)] text-[var(--color-foreground)]"
        : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl glass p-5 max-h-[92vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-lg font-semibold">Post a P2P ad</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Side */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--color-surface-2)] p-1 mb-3">
          {(["SELL", "BUY"] as OrderSide[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={cn(
                "py-2 rounded-md text-sm font-medium transition-colors",
                side === s
                  ? s === "SELL"
                    ? "bg-[var(--color-down)] text-white"
                    : "bg-[var(--color-up)] text-black"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
              )}
            >
              {s === "SELL" ? "I'm selling" : "I'm buying"}
            </button>
          ))}
        </div>

        {/* Asset + Fiat */}
        <div className="space-y-2 mb-3">
          <div>
            <div className="text-xs text-[var(--color-muted)] mb-1">Asset</div>
            <div className="flex flex-wrap gap-2">
              {ASSETS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAsset(a)}
                  className={cn("inline-flex items-center gap-1.5", pill(a === asset))}
                >
                  <AssetCoin symbol={a} size={18} /> {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--color-muted)] mb-1">Fiat</div>
            <div className="flex flex-wrap gap-2">
              {FIATS.map((f) => (
                <button key={f} type="button" onClick={() => setFiat(f)} className={pill(f === fiat)}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Price */}
        <Field label={`Price (${fiat} per 1 ${asset})`}>
          <input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(num(e.target.value))}
            placeholder="0.00"
            className={inputCls}
          />
        </Field>

        {/* Available */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-[var(--color-muted)] mb-1">
            <span>Total {asset} to offer</span>
            {isSell ? (
              <button
                type="button"
                onClick={() => setAvailable(String(balance))}
                className="hover:text-[var(--color-foreground)]"
              >
                Balance: {balance.toLocaleString(undefined, { maximumFractionDigits: 8 })} {asset}
              </button>
            ) : null}
          </div>
          <input
            inputMode="decimal"
            value={available}
            onChange={(e) => setAvailable(num(e.target.value))}
            placeholder="0.0"
            className={cn(inputCls, sellNeedsBalance && "text-[var(--color-down)]")}
          />
        </div>

        {/* Limits */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Field label={`Min order (${fiat})`}>
            <input inputMode="decimal" value={minLimit} onChange={(e) => setMinLimit(num(e.target.value))} placeholder="0" className={inputCls} />
          </Field>
          <Field label={`Max order (${fiat})`}>
            <input inputMode="decimal" value={maxLimit} onChange={(e) => setMaxLimit(num(e.target.value))} placeholder="0" className={inputCls} />
          </Field>
        </div>

        {/* Payment methods */}
        <div className="mt-3">
          <div className="text-xs text-[var(--color-muted)] mb-1">
            Payment methods {isSell ? "you accept" : "you'll pay with"}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {methods.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMethod(m.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm border",
                  selMethods.includes(m.id)
                    ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                )}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Terms */}
        <div className="mt-3">
          <div className="text-xs text-[var(--color-muted)] mb-1">Terms (optional)</div>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value.slice(0, 500))}
            rows={2}
            placeholder="e.g. Release within 5 minutes of payment. No third-party transfers."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] resize-none"
          />
        </div>

        {error ? <div className="mt-3 text-sm text-[var(--color-down)]">{error}</div> : null}

        <button
          type="button"
          disabled={!valid || submitting}
          onClick={submit}
          className={cn(
            "mt-4 w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2",
            valid && !submitting
              ? "btn-brand"
              : "bg-[var(--color-surface-2)] text-[var(--color-muted)] cursor-not-allowed",
          )}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {sellNeedsBalance ? `Insufficient ${asset}` : submitting ? "Posting…" : "Post ad"}
        </button>

        {isSell ? (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-muted)]">
            <ShieldCheck className="h-3 w-3" /> Your {available || "0"} {asset} is escrow-locked while
            the ad is live.
          </div>
        ) : null}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm tabular-nums outline-none focus:border-[var(--color-accent)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-[var(--color-muted)] mb-1">{label}</div>
      {children}
    </label>
  );
}
