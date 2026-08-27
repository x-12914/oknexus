"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Printer, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityKind, ActivityRecord } from "@/lib/activity-types";

const KINDS: { id: ActivityKind; label: string }[] = [
  { id: "order", label: "Orders" },
  { id: "trade", label: "Trades" },
  { id: "deposit", label: "Deposits" },
  { id: "withdrawal", label: "Withdrawals" },
  { id: "swap", label: "Swaps" },
  { id: "otc", label: "OTC" },
  { id: "p2p", label: "P2P" },
  { id: "fiat", label: "Fiat" },
  { id: "transfer", label: "Transfers" },
];

const PAGE = 50;

function tone(status: string): string {
  const s = status.toUpperCase();
  if (["COMPLETED", "FILLED", "CREDITED", "CONFIRMED"].includes(s)) return "text-[var(--color-up)]";
  if (["FAILED", "CANCELLED", "REJECTED", "EXPIRED"].includes(s)) return "text-[var(--color-down)]";
  return "text-[var(--color-muted)]";
}

export function ActivityCenter() {
  const [selected, setSelected] = useState<ActivityKind[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ records: ActivityRecord[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (selected.length) p.set("kinds", selected.join(","));
    if (q.trim()) p.set("q", q.trim());
    p.set("sort", sort);
    return p;
  }, [selected, q, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams(params);
      p.set("limit", String(PAGE));
      p.set("offset", String(page * PAGE));
      const r = await fetch(`/api/activity?${p}`, { cache: "no-store" });
      setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, [params, page]);

  useEffect(() => {
    // Debounced so typing in the search box doesn't fire a request per keystroke,
    // and deferred out of the effect body for React 19's purity rule.
    const t = setTimeout(() => {
      load().catch(() => setData({ records: [], total: 0 }));
    }, 250);
    return () => clearTimeout(t);
  }, [load]);

  const toggle = (k: ActivityKind) => {
    setPage(0);
    setSelected((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  };

  const records = data?.records ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / PAGE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Orders & activity</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Every trade, transfer and transaction on your account, in one place.
          </p>
        </div>
        <div className="flex gap-2">
          {/* CSV is generated server-side from the same filter. PDF is left to
              the browser's print dialog rather than bundling a PDF renderer for
              what every browser already does well. */}
          <a
            href={`/api/activity/export?${params}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-accent)]"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-foreground)] transition hover:border-[var(--color-accent)]"
          >
            <Printer className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setSelected([]);
            setPage(0);
          }}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition",
            selected.length === 0
              ? "bg-[var(--color-accent)] text-white"
              : "border border-[var(--color-border)] text-[var(--color-muted)]",
          )}
        >
          All
        </button>
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => toggle(k.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              selected.includes(k.id)
                ? "bg-[var(--color-accent)] text-white"
                : "border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
          <input
            value={q}
            onChange={(e) => {
              setPage(0);
              setQ(e.target.value);
            }}
            placeholder="Search asset, status, reference…"
            className="w-full bg-transparent text-sm text-[var(--color-foreground)] outline-none"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)]"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Details</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={`${r.kind}-${r.id}`} className="border-t border-[var(--color-border)]">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-muted)]">
                  {new Date(r.createdAt).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-xs capitalize text-[var(--color-muted)]">
                    {r.kind}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--color-foreground)]">{r.detail}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[var(--color-foreground)]">
                  {r.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })} {r.asset}
                </td>
                <td className={cn("whitespace-nowrap px-4 py-3 text-right text-xs", tone(r.status))}>
                  {r.status}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--color-muted)]">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </span>
                  ) : (
                    "Nothing here yet."
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>
            {page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
