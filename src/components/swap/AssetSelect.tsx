"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SwapAsset } from "@/lib/exchange/types";

const COLORS: Record<string, string> = {
  USDT: "#26a17b",
  BTC: "#f7931a",
  ETH: "#627eea",
  SOL: "#14f195",
  BNB: "#f0b90b",
  XRP: "#23292f",
  ADA: "#0033ad",
};

export function AssetCoin({ symbol, size = 24 }: { symbol: string; size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-full text-black font-bold shrink-0"
      style={{
        width: size,
        height: size,
        background: COLORS[symbol] ?? "#8b93a1",
        fontSize: size * 0.42,
      }}
    >
      {symbol.charAt(0)}
    </span>
  );
}

export function AssetSelect({
  assets,
  value,
  exclude,
  onChange,
}: {
  assets: SwapAsset[];
  value: string;
  exclude?: string;
  onChange: (symbol: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = assets.filter((a) => a.symbol !== exclude);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 hover:bg-[var(--color-surface-2)]"
      >
        <AssetCoin symbol={value} />
        <span className="font-medium text-sm">{value}</span>
        <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-20 mt-1 w-48 max-h-64 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl scrollbar-thin">
            {options.map((a) => (
              <button
                key={a.symbol}
                type="button"
                onClick={() => {
                  onChange(a.symbol);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-surface-2)]",
                  a.symbol === value && "bg-[var(--color-surface-2)]",
                )}
              >
                <AssetCoin symbol={a.symbol} />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{a.symbol}</div>
                  <div className="text-xs text-[var(--color-muted)] truncate">{a.name}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
