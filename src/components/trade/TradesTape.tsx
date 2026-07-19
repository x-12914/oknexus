"use client";

import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { formatPrice, formatQty, cn } from "@/lib/utils";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export function TradesTape({ pair }: { pair: string }) {
  const { data } = usePolling(() => api.trades(pair, 40), 2000, [pair]);
  const { data: ticker } = usePolling(() => api.ticker(pair), 2000, [pair]);
  const priceDecimals = ticker && ticker.last < 1 ? 5 : 2;

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface)]">
      <div className="px-3 py-2 border-b border-[var(--color-border)] text-sm font-medium">
        Recent Trades
      </div>
      <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
        <div>Price</div>
        <div className="text-right">Size</div>
        <div className="text-right">Time</div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {data?.trades.map((t) => (
          <div
            key={t.id}
            className="grid grid-cols-3 px-3 py-[3px] text-xs tabular-nums"
          >
            <div
              className={cn(
                t.side === "BUY" ? "text-[var(--color-up)]" : "text-[var(--color-down)]",
              )}
            >
              {formatPrice(t.price, priceDecimals)}
            </div>
            <div className="text-right text-[var(--color-foreground)]/90">
              {formatQty(t.quantity, t.quantity < 1 ? 5 : 3)}
            </div>
            <div className="text-right text-[var(--color-muted)]">
              {formatTime(t.timestamp)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
