"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Corridor } from "@/lib/ramp/types";

const METHOD_LABEL: Record<string, string> = {
  bank: "Bank transfer",
  mobile_money: "Mobile money",
  paybill: "Paybill",
  paytill: "Paytill",
  swift: "SWIFT",
  wire: "Wire",
  ach: "ACH",
};

function methods(list: string[]): string {
  return list.map((m) => METHOD_LABEL[m] ?? m).join(" · ");
}

export function CorridorStrip() {
  const [corridors, setCorridors] = useState<Corridor[] | null>(null);

  useEffect(() => {
    // rAF rather than a synchronous call: React 19 rejects setState straight
    // from an effect body, and the fetch resolves into one.
    const raf = requestAnimationFrame(() => {
      api
        .corridors()
        .then((r) => setCorridors(r.corridors))
        .catch(() => setCorridors([]));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Nothing to say if the provider is unreachable — better than an empty shell.
  if (!corridors || corridors.length === 0) return null;

  // Live corridors first: the one you can actually use should lead.
  const sorted = [...corridors].sort((a, b) => Number(b.live) - Number(a.live));

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-foreground)]">
            Payment corridors
          </h2>
          <p className="text-xs text-[var(--color-muted)]">
            Where you can move money in and out, straight to local rails.
          </p>
        </div>
        <Link
          href="/withdraw"
          className="shrink-0 text-xs font-medium text-[var(--color-accent)] hover:underline"
        >
          Cash out
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {sorted.map((c) => (
          <div
            key={`${c.country}-${c.currency}`}
            className={cn(
              "relative w-44 shrink-0 rounded-xl border bg-[var(--color-surface)] p-3",
              c.live
                ? "border-[var(--color-accent)]"
                : "border-[var(--color-border)]",
            )}
          >
            <span
              className={cn(
                "absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                c.region === "africa"
                  ? "bg-[var(--color-up-bg)] text-[var(--color-up)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-muted)]",
              )}
            >
              {c.region === "africa" ? "AF" : "Global"}
            </span>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)]">
              <span aria-hidden>{c.flag}</span>
              <span className="truncate">{c.countryName}</span>
            </div>

            {/* A rate is shown only where we have a real one. The other
                corridors say what they support instead of inventing a number. */}
            {c.rate !== null ? (
              <>
                <p className="mt-1.5 font-mono text-sm font-semibold text-[var(--color-foreground)]">
                  {c.rate.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-[var(--color-muted)]">{c.currency} per USDT</p>
              </>
            ) : (
              <p className="mt-1.5 text-sm font-semibold text-[var(--color-foreground)]">
                {c.currency}
              </p>
            )}

            <p className="mt-2 truncate text-[10px] text-[var(--color-muted)]">
              {methods(c.methods)}
            </p>

            {c.live ? (
              <Link
                href="/withdraw"
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-accent)]"
              >
                Available now <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <p className="mt-2 text-[11px] text-[var(--color-muted)]">Coming soon</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
