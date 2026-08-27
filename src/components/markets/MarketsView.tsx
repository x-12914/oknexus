"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, TrendingUp, TrendingDown, BarChart3, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";

/**
 * Tabs are derived from live ticker data only.
 *
 * There is deliberately no "New listings" tab: Market has no listing date and
 * every pair was seeded at once, so the tab could only be filled by picking
 * arbitrary rows and calling them new.
 */
type TabId = "all" | "gainers" | "losers" | "volume";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All markets" },
  { id: "gainers", label: "Top gainers" },
  { id: "losers", label: "Top losers" },
  { id: "volume", label: "Highest volume" },
];

function money(v: number): string {
  if (v >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(6);
}

function compact(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(2);
}

/** "BTC/USDT" is the market symbol; routes use "BTC-USDT". */
const toPairSlug = (symbol: string) => symbol.replace("/", "-");

export function MarketsView() {
  const [tab, setTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");
  const { data, error } = usePolling(() => api.marketsOverview(), 10_000);
  const rows = data?.rows;

  const visible = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    let list = q
      ? rows.filter(
          (r) => r.base.toLowerCase().includes(q) || r.symbol.toLowerCase().includes(q),
        )
      : [...rows];

    switch (tab) {
      case "gainers":
        list = list.filter((r) => r.changePct24h > 0).sort((a, b) => b.changePct24h - a.changePct24h);
        break;
      case "losers":
        list = list.filter((r) => r.changePct24h < 0).sort((a, b) => a.changePct24h - b.changePct24h);
        break;
      case "volume":
        list = list.sort((a, b) => b.volume24h - a.volume24h);
        break;
      default:
        list = list.sort((a, b) => a.symbol.localeCompare(b.symbol));
    }
    return list;
  }, [rows, tab, query]);

  if (error && !rows) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-muted)]">
        Market data is unavailable right now. It&apos;ll reappear on its own once the feed
        recovers.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Markets</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Live prices across every pair on OKNexus.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
          <Search className="h-4 w-4 text-[var(--color-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a coin"
            className="w-40 bg-transparent text-sm text-[var(--color-foreground)] outline-none"
          />
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition",
              tab === t.id
                ? "border-[var(--color-accent)] text-[var(--color-foreground)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!rows ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading markets…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <th className="px-4 py-3 font-medium">Pair</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">24h</th>
                <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">24h high</th>
                <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">24h low</th>
                <th className="px-4 py-3 text-right font-medium">Volume</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const up = r.changePct24h >= 0;
                return (
                  <tr
                    key={r.symbol}
                    className="border-t border-[var(--color-border)] transition hover:bg-[var(--color-surface-2)]"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/trade/${toPairSlug(r.symbol)}`} className="block">
                        <span className="font-semibold text-[var(--color-foreground)]">
                          {r.base}
                        </span>
                        <span className="text-[var(--color-muted)]">/{r.quote}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--color-foreground)]">
                      {money(r.last)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-medium",
                        up ? "text-[var(--color-up)]" : "text-[var(--color-down)]",
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {up ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {up ? "+" : ""}
                        {r.changePct24h.toFixed(2)}%
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-right text-[var(--color-muted)] sm:table-cell">
                      {money(r.high24h)}
                    </td>
                    <td className="hidden px-4 py-3 text-right text-[var(--color-muted)] sm:table-cell">
                      {money(r.low24h)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-muted)]">
                      {compact(r.volume24h)}
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-[var(--color-muted)]"
                  >
                    <BarChart3 className="mx-auto mb-2 h-5 w-5" />
                    {query
                      ? `Nothing matching "${query}".`
                      : "No markets in this category right now."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
