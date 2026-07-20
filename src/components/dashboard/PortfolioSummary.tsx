"use client";

import { useState } from "react";
import { Eye, EyeOff, TrendingUp } from "lucide-react";

export function PortfolioSummary({ totalUsd }: { totalUsd: string }) {
  const [visible, setVisible] = useState(true);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6 relative overflow-hidden">
      {/* Subtle gradient accent */}
      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-[var(--color-up)]/8 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--color-accent)]" />
            <span className="text-sm text-[var(--color-muted)]">Estimated Balance</span>
          </div>
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="p-1.5 rounded-md text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)] transition-colors"
            aria-label={visible ? "Hide balance" : "Show balance"}
          >
            {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-3">
          <span className="text-3xl font-bold tracking-tight">
            {visible ? `$${totalUsd}` : "••••••"}
          </span>
          <span className="ml-2 text-sm text-[var(--color-muted)]">USD</span>
        </div>
      </div>
    </div>
  );
}
