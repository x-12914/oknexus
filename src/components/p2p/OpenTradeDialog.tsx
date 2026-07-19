"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Clock, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { P2PAd } from "@/lib/exchange/types";
import { MerchantBadge } from "./MerchantBadge";

export function OpenTradeDialog({
  ad,
  methodName,
  onClose,
}: {
  ad: P2PAd;
  methodName: (id: string) => string;
  onClose: () => void;
}) {
  const router = useRouter();
  const takerBuys = ad.side === "SELL"; // merchant sells → you buy
  const [fiatAmount, setFiatAmount] = useState("");
  const [method, setMethod] = useState(ad.paymentMethods[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fiatNum = Number(fiatAmount);
  const assetAmount = fiatNum > 0 ? fiatNum / ad.price : 0;
  const outOfRange = fiatNum > 0 && (fiatNum < ad.minLimit || fiatNum > ad.maxLimit);
  const valid = fiatNum > 0 && !outOfRange;

  const fmtFiat = (v: number) =>
    v.toLocaleString(undefined, { maximumFractionDigits: 2 });

  const submit = async () => {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.p2pCreateOrder(ad.id, fiatNum, method);
      router.push(`/p2p/order/${order.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl glass p-5">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">
            {takerBuys ? "Buy" : "Sell"} {ad.asset}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
          <MerchantBadge merchant={ad.merchant} />
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-[var(--color-muted)]">Price</span>
            <span className="tabular-nums font-medium">
              {ad.price.toLocaleString(undefined, { maximumFractionDigits: 4 })} {ad.fiat}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
            <span>Available {ad.available.toLocaleString()} {ad.asset}</span>
            <span>
              Limit {ad.minLimit.toLocaleString()}–{ad.maxLimit.toLocaleString()} {ad.fiat}
            </span>
          </div>
        </div>

        {/* Amount */}
        <div className="mt-3">
          <label className="text-xs text-[var(--color-muted)]">
            {takerBuys ? "I will pay" : "I will receive"}
          </label>
          <div className="mt-1 flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3">
            <input
              type="text"
              inputMode="decimal"
              value={fiatAmount}
              onChange={(e) => setFiatAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.00"
              className={cn(
                "flex-1 min-w-0 bg-transparent py-2.5 text-lg font-medium tabular-nums outline-none",
                outOfRange && "text-[var(--color-down)]",
              )}
            />
            <span className="text-sm text-[var(--color-muted)]">{ad.fiat}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setFiatAmount(String(ad.minLimit))}
              className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            >
              Min {ad.minLimit.toLocaleString()}
            </button>
            <span className="text-[var(--color-muted)]">
              {takerBuys ? "I will receive" : "I will send"}{" "}
              <span className="text-[var(--color-foreground)] tabular-nums">
                {assetAmount.toLocaleString(undefined, { maximumFractionDigits: 8 })} {ad.asset}
              </span>
            </span>
          </div>
        </div>

        {/* Payment method */}
        <div className="mt-3">
          <label className="text-xs text-[var(--color-muted)]">Payment method</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {ad.paymentMethods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm border",
                  method === m
                    ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                )}
              >
                {methodName(m)}
              </button>
            ))}
          </div>
        </div>

        {outOfRange ? (
          <div className="mt-3 text-xs text-[var(--color-down)]">
            Enter an amount within {ad.minLimit.toLocaleString()}–{ad.maxLimit.toLocaleString()}{" "}
            {ad.fiat}.
          </div>
        ) : null}
        {error ? <div className="mt-3 text-sm text-[var(--color-down)]">{error}</div> : null}

        <button
          type="button"
          disabled={!valid || submitting}
          onClick={submit}
          className={cn(
            "mt-4 w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2",
            valid && !submitting
              ? takerBuys
                ? "bg-[var(--color-up)] text-black hover:opacity-90"
                : "bg-[var(--color-down)] text-white hover:opacity-90"
              : "bg-[var(--color-surface-2)] text-[var(--color-muted)] cursor-not-allowed",
          )}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting
            ? "Opening trade…"
            : `${takerBuys ? "Buy" : "Sell"} ${assetAmount > 0 ? fmtFiat(assetAmount) : ""} ${ad.asset}`}
        </button>

        <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-[var(--color-muted)]">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Escrow protected
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> 15-min payment window
          </span>
        </div>
      </div>
    </div>
  );
}
