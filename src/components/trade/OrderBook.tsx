"use client";

import { useMemo } from "react";
import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { formatPrice, formatQty, cn } from "@/lib/utils";
import type { OrderBookLevel } from "@/lib/exchange/types";

export function OrderBook({
  pair,
  onPickPrice,
}: {
  pair: string;
  onPickPrice?: (price: number) => void;
}) {
  const { data } = usePolling(() => api.orderBook(pair, 14), 1500, [pair]);
  const { data: ticker } = usePolling(() => api.ticker(pair), 1500, [pair]);

  const priceDecimals = ticker && ticker.last < 1 ? 5 : 2;

  const maxTotal = useMemo(() => {
    if (!data) return 1;
    const b = data.bids[data.bids.length - 1]?.total ?? 0;
    const a = data.asks[data.asks.length - 1]?.total ?? 0;
    return Math.max(b, a, 1);
  }, [data]);

  const spread = data && data.asks[0] && data.bids[0]
    ? data.asks[0].price - data.bids[0].price
    : 0;
  const spreadPct = data && data.bids[0]
    ? (spread / data.bids[0].price) * 100
    : 0;

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface)]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
        <div className="text-sm font-medium">Order Book</div>
        <div className="text-xs text-[var(--color-muted)]">Depth 14</div>
      </div>
      <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
        <div>Price</div>
        <div className="text-right">Size</div>
        <div className="text-right">Total</div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col scrollbar-thin">
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col-reverse">
          {data?.asks.slice().reverse().map((lvl, i) => (
            <BookRow
              key={`a-${i}`}
              level={lvl}
              side="ask"
              maxTotal={maxTotal}
              priceDecimals={priceDecimals}
              onPickPrice={onPickPrice}
            />
          ))}
        </div>

        <div className="border-y border-[var(--color-border)] px-3 py-2 flex items-center justify-between text-xs">
          <div className={cn("tabular-nums font-medium", ticker && ticker.changePct24h >= 0 ? "text-[var(--color-up)]" : "text-[var(--color-down)]")}>
            {ticker ? formatPrice(ticker.last, priceDecimals) : "—"}
          </div>
          <div className="text-[var(--color-muted)] tabular-nums">
            Spread {spread ? formatPrice(spread, priceDecimals) : "—"}
            {spreadPct ? ` (${spreadPct.toFixed(3)}%)` : ""}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {data?.bids.map((lvl, i) => (
            <BookRow
              key={`b-${i}`}
              level={lvl}
              side="bid"
              maxTotal={maxTotal}
              priceDecimals={priceDecimals}
              onPickPrice={onPickPrice}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BookRow({
  level,
  side,
  maxTotal,
  priceDecimals,
  onPickPrice,
}: {
  level: OrderBookLevel;
  side: "bid" | "ask";
  maxTotal: number;
  priceDecimals: number;
  onPickPrice?: (price: number) => void;
}) {
  const pct = Math.min(100, (level.total / maxTotal) * 100);
  return (
    <button
      type="button"
      onClick={() => onPickPrice?.(level.price)}
      className={cn(
        "relative grid grid-cols-3 items-center px-3 py-[3px] text-xs tabular-nums w-full text-left",
        "hover:bg-[var(--color-surface-2)] transition-colors",
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 right-0",
          side === "bid" ? "bg-[var(--color-up-bg)]" : "bg-[var(--color-down-bg)]",
        )}
        style={{ width: `${pct}%` }}
        aria-hidden
      />
      <div className={cn("relative z-10", side === "bid" ? "text-[var(--color-up)]" : "text-[var(--color-down)]")}>
        {formatPrice(level.price, priceDecimals)}
      </div>
      <div className="relative z-10 text-right text-[var(--color-foreground)]/90">
        {formatQty(level.quantity, level.quantity < 1 ? 5 : 3)}
      </div>
      <div className="relative z-10 text-right text-[var(--color-muted)]">
        {formatQty(level.total, level.total < 1 ? 5 : 2)}
      </div>
    </button>
  );
}
