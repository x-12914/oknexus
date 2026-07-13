"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { cn, formatPrice } from "@/lib/utils";
import type { OrderSide, OrderType } from "@/lib/exchange/types";

export function OrderForm({
  pair,
  presetPrice,
  onPlaced,
}: {
  pair: string;
  presetPrice: number | null;
  onPlaced: () => void;
}) {
  const [side, setSide] = useState<OrderSide>("BUY");
  const [type, setType] = useState<OrderType>("LIMIT");
  const [price, setPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data: ticker } = usePolling(() => api.ticker(pair), 2000, [pair]);
  const symbol = pair.replace("-", "/");
  const [base, quote] = symbol.split("/");

  const priceDecimals = ticker && ticker.last < 1 ? 5 : 2;

  // Sync the price field from an order-book click, adjusting state during
  // render (React-recommended over an effect for prop-derived state).
  const [lastPreset, setLastPreset] = useState<number | null>(presetPrice);
  if (presetPrice !== lastPreset) {
    setLastPreset(presetPrice);
    if (presetPrice != null) setPrice(presetPrice.toFixed(priceDecimals));
  }

  // Seed the limit price with the live price once the ticker first loads.
  const [priceSeeded, setPriceSeeded] = useState(false);
  if (!priceSeeded && ticker && type === "LIMIT") {
    setPriceSeeded(true);
    if (!price) setPrice(ticker.last.toFixed(priceDecimals));
  }

  const totalNum =
    type === "LIMIT"
      ? Number(price || 0) * Number(quantity || 0)
      : (ticker?.last ?? 0) * Number(quantity || 0);

  const submit = async () => {
    setError(null);
    setMessage(null);
    const qty = Number(quantity);
    if (!(qty > 0)) {
      setError("Enter a quantity");
      return;
    }
    if (type === "LIMIT" && !(Number(price) > 0)) {
      setError("Enter a limit price");
      return;
    }
    setSubmitting(true);
    try {
      const order = await api.placeOrder({
        pair,
        side,
        type,
        quantity: qty,
        price: type === "LIMIT" ? Number(price) : undefined,
      });
      setMessage(
        `${side} ${type} ${qty} ${base} placed · ${order.status}${order.avgFillPrice ? ` @ ${formatPrice(order.avgFillPrice, priceDecimals)}` : ""}`,
      );
      setQuantity("");
      onPlaced();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface)] p-3">
      <div className="grid grid-cols-2 rounded-md overflow-hidden border border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => setSide("BUY")}
          className={cn(
            "py-2 text-sm font-medium",
            side === "BUY" ? "bg-[var(--color-up)] text-white" : "bg-transparent text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
          )}
        >
          Buy {base}
        </button>
        <button
          type="button"
          onClick={() => setSide("SELL")}
          className={cn(
            "py-2 text-sm font-medium",
            side === "SELL" ? "bg-[var(--color-down)] text-white" : "bg-transparent text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
          )}
        >
          Sell {base}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-1 text-xs">
        {(["LIMIT", "MARKET"] as OrderType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "px-2 py-1 rounded",
              type === t
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            )}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2 text-sm">
        {type === "LIMIT" ? (
          <Field
            label="Price"
            unit={quote}
            value={price}
            onChange={setPrice}
            placeholder={ticker ? ticker.last.toFixed(priceDecimals) : "0"}
          />
        ) : (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-muted)]">
            Market — filled against best {side === "BUY" ? "ask" : "bid"} @{" "}
            <span className="text-[var(--color-foreground)] tabular-nums">
              {ticker ? formatPrice(side === "BUY" ? ticker.ask : ticker.bid, priceDecimals) : "—"}
            </span>
          </div>
        )}

        <Field
          label="Amount"
          unit={base}
          value={quantity}
          onChange={setQuantity}
          placeholder="0.00"
        />

        <div className="grid grid-cols-4 gap-1">
          {[25, 50, 75, 100].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                if (!ticker) return;
                const budget = 1000;
                const px = type === "LIMIT" ? Number(price) || ticker.last : ticker.last;
                if (px > 0) {
                  setQuantity(((budget * (p / 100)) / px).toFixed(6));
                }
              }}
              className="text-xs py-1 rounded border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
            >
              {p}%
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--color-muted)] pt-1">
          <span>Total</span>
          <span className="tabular-nums text-[var(--color-foreground)]">
            {totalNum > 0 ? `${formatPrice(totalNum, 2)} ${quote}` : "—"}
          </span>
        </div>

        {error ? (
          <div className="text-xs text-[var(--color-down)]">{error}</div>
        ) : null}
        {message ? (
          <div className="text-xs text-[var(--color-up)]">{message}</div>
        ) : null}

        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className={cn(
            "w-full mt-1 py-2 rounded-md text-sm font-medium disabled:opacity-60",
            side === "BUY"
              ? "bg-[var(--color-up)] text-white hover:brightness-110"
              : "bg-[var(--color-down)] text-white hover:brightness-110",
          )}
        >
          {submitting ? "Placing…" : `${side === "BUY" ? "Buy" : "Sell"} ${base}`}
        </button>

        <div className="text-[10px] text-[var(--color-muted)] pt-2 leading-relaxed">
          Fees: 0.10% maker · 0.20% taker · settles to your wallet
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  unit,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] mb-1">
        {label}
      </div>
      <div className="flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] focus-within:border-[var(--color-accent)]">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-3 py-2 text-sm tabular-nums outline-none placeholder:text-[var(--color-muted)]"
        />
        <span className="px-3 text-xs text-[var(--color-muted)]">{unit}</span>
      </div>
    </label>
  );
}
