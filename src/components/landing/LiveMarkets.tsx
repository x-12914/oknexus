"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { AssetCoin } from "@/components/swap/AssetSelect";
import type { Ticker } from "@/lib/exchange/types";

const ROWS: { symbol: string; name: string; pair: string }[] = [
  { symbol: "BTC", name: "Bitcoin", pair: "BTC-USDT" },
  { symbol: "ETH", name: "Ethereum", pair: "ETH-USDT" },
  { symbol: "SOL", name: "Solana", pair: "SOL-USDT" },
  { symbol: "XRP", name: "XRP", pair: "XRP-USDT" },
];

function fmtPrice(v: number): string {
  const d = v >= 100 ? 2 : v >= 1 ? 3 : 5;
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: d });
}

export function LiveMarkets() {
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      for (const r of ROWS) {
        api
          .ticker(r.pair)
          .then((t) => {
            if (!cancelled) setTickers((prev) => ({ ...prev, [r.symbol]: t }));
          })
          .catch(() => {});
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl glass p-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-up)] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-up)]" />
          </span>
          Live markets
        </div>
        <Link
          href="/trade/BTC-USDT"
          className="inline-flex items-center gap-0.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        >
          View all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-1">
        {ROWS.map((r) => {
          const t = tickers[r.symbol];
          const up = (t?.changePct24h ?? 0) >= 0;
          return (
            <Link
              key={r.symbol}
              href={`/trade/${r.pair}`}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-[var(--color-surface-2)]"
            >
              <AssetCoin symbol={r.symbol} size={30} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{r.symbol}/USDT</div>
                <div className="text-xs text-[var(--color-muted)] truncate">{r.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium tabular-nums">
                  {t ? `$${fmtPrice(t.last)}` : "—"}
                </div>
                <div
                  className={cn(
                    "text-xs tabular-nums",
                    up ? "text-[var(--color-up)]" : "text-[var(--color-down)]",
                  )}
                >
                  {t ? `${up ? "+" : ""}${t.changePct24h.toFixed(2)}%` : ""}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
