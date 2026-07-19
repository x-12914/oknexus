"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { formatPrice, formatQty, formatPct, cn } from "@/lib/utils";

const PAIRS = [
  "BTC-USDT",
  "ETH-USDT",
  "SOL-USDT",
  "BNB-USDT",
  "XRP-USDT",
  "ADA-USDT",
];

export function MarketHeader({ pair }: { pair: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: ticker } = usePolling(() => api.ticker(pair), 2000, [pair]);
  const symbol = pair.replace("-", "/");
  const change = ticker?.changePct24h ?? 0;
  const isUp = change >= 0;

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div className="flex items-center gap-6 flex-wrap">
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-[var(--color-surface-2)]"
          >
            <div className="text-xl font-semibold">{symbol}</div>
            <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" />
          </button>
          {open ? (
            <div
              className="absolute z-10 mt-1 w-40 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
              onMouseLeave={() => setOpen(false)}
            >
              {PAIRS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/trade/${p}`);
                  }}
                  className={cn(
                    "block w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-surface-2)]",
                    p === pair && "text-[var(--color-accent)]",
                  )}
                >
                  {p.replace("-", "/")}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col">
          <div
            className={cn(
              "text-2xl font-semibold tabular-nums",
              ticker ? (isUp ? "text-[var(--color-up)]" : "text-[var(--color-down)]") : "text-[var(--color-foreground)]",
            )}
          >
            {ticker ? formatPrice(ticker.last, ticker.last < 1 ? 4 : 2) : "—"}
          </div>
          <div
            className={cn(
              "text-xs flex items-center gap-1 tabular-nums",
              isUp ? "text-[var(--color-up)]" : "text-[var(--color-down)]",
            )}
          >
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {ticker ? formatPct(change) : "—"}
          </div>
        </div>

        <Stat label="24h High" value={ticker && formatPrice(ticker.high24h, ticker.last < 1 ? 4 : 2)} />
        <Stat label="24h Low" value={ticker && formatPrice(ticker.low24h, ticker.last < 1 ? 4 : 2)} />
        <Stat
          label={`24h Vol (${symbol.split("/")[0]})`}
          value={ticker && formatQty(ticker.volume24h, 2)}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | undefined | null | false }) {
  return (
    <div className="flex flex-col">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">{label}</div>
      <div className="text-sm tabular-nums">{value || "—"}</div>
    </div>
  );
}
