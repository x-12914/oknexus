"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { cn, formatPrice } from "@/lib/utils";
import type { OrderSide, OrderType } from "@/lib/exchange/types";

const TYPE_LABEL: Record<OrderType, string> = {
  LIMIT: "Limit",
  MARKET: "Market",
  STOP: "Stop",
  STOP_LIMIT: "Stop-Limit",
};
const ORDER_TYPES: OrderType[] = ["LIMIT", "MARKET", "STOP", "STOP_LIMIT"];

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
  const [triggerPrice, setTriggerPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, number> | null>(null);

  const { data: ticker } = usePolling(() => api.ticker(pair), 2000, [pair]);
  const symbol = pair.replace("-", "/");
  const [base, quote] = symbol.split("/");
  const showLimitPrice = type === "LIMIT" || type === "STOP_LIMIT";
  const showTrigger = type === "STOP" || type === "STOP_LIMIT";

  const loadBalances = useCallback(() => {
    api
      .wallet()
      .then((p) => setBalances(Object.fromEntries(p.items.map((i) => [i.symbol, i.balance]))))
      .catch(() => setBalances(null));
  }, []);
  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

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
  if (!priceSeeded && ticker && showLimitPrice) {
    setPriceSeeded(true);
    if (!price) setPrice(ticker.last.toFixed(priceDecimals));
  }

  const totalNum =
    (showLimitPrice ? Number(price || 0) : (ticker?.last ?? 0)) * Number(quantity || 0);

  const submit = async () => {
    setError(null);
    setMessage(null);
    const qty = Number(quantity);
    if (!(qty > 0)) {
      setError("Enter a quantity");
      return;
    }
    if (showLimitPrice && !(Number(price) > 0)) {
      setError("Enter a limit price");
      return;
    }
    if (showTrigger && !(Number(triggerPrice) > 0)) {
      setError("Enter a trigger price");
      return;
    }
    setSubmitting(true);
    try {
      const order = await api.placeOrder({
        pair,
        side,
        type,
        quantity: qty,
        price: showLimitPrice ? Number(price) : undefined,
        triggerPrice: showTrigger ? Number(triggerPrice) : undefined,
      });
      setMessage(
        `${side} ${type} ${qty} ${base} placed · ${order.status}${order.avgFillPrice ? ` @ ${formatPrice(order.avgFillPrice, priceDecimals)}` : ""}`,
      );
      setQuantity("");
      onPlaced();
      loadBalances();
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

      <div className="mt-3 flex items-center gap-0.5 text-xs">
        {ORDER_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "px-1.5 py-1 rounded whitespace-nowrap",
              type === t
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            )}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2 text-sm">
        {showTrigger ? (
          <Field
            label="Trigger price"
            unit={quote}
            value={triggerPrice}
            onChange={setTriggerPrice}
            placeholder={ticker ? ticker.last.toFixed(priceDecimals) : "0"}
          />
        ) : null}
        {showLimitPrice ? (
          <Field
            label="Limit price"
            unit={quote}
            value={price}
            onChange={setPrice}
            placeholder={ticker ? ticker.last.toFixed(priceDecimals) : "0"}
          />
        ) : (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-muted)]">
            {type === "STOP" ? "Triggers a market order" : "Market"} — filled against best{" "}
            {side === "BUY" ? "ask" : "bid"} @{" "}
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
                const px = type === "LIMIT" ? Number(price) || ticker.last : ticker.last;
                if (!(px > 0)) return;
                const frac = p / 100;
                // BUY spends the quote balance; SELL sells the base balance.
                // Falls back to a $1,000 preview when signed out (balances unknown).
                const qty =
                  balances == null
                    ? (1000 * frac) / px
                    : side === "BUY"
                      ? ((balances[quote] ?? 0) * frac) / px
                      : (balances[base] ?? 0) * frac;
                setQuantity(qty.toFixed(6));
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

        {showTrigger ? (
          <div className="text-[10px] leading-relaxed text-[var(--color-muted)]">
            {side === "BUY"
              ? "Buy stop fires when the price rises to your trigger."
              : "Sell stop fires when the price falls to your trigger."}{" "}
            Funds must be available then.
          </div>
        ) : null}

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
          {submitting
            ? "Placing…"
            : showTrigger
              ? `Place ${side === "BUY" ? "buy" : "sell"} stop`
              : `${side === "BUY" ? "Buy" : "Sell"} ${base}`}
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
