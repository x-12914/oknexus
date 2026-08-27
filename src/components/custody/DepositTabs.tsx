"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { DepositPanel } from "@/components/custody/DepositPanel";
import { NairaDepositPanel } from "@/components/ramp/NairaDepositPanel";

/**
 * Crypto and naira are both "deposit", but they share almost nothing: one is an
 * address on a chain, the other a bank account behind an identity check. They
 * sit side by side here rather than merged, so neither flow is bent to fit the
 * other's shape.
 */
export function DepositTabs() {
  const [tab, setTab] = useState<"crypto" | "naira">("crypto");

  return (
    <div className="h-full overflow-y-auto">
      {tab === "crypto" ? (
        <DepositPanel headerSlot={<Switch tab={tab} setTab={setTab} />} />
      ) : (
        <div className="mx-auto max-w-lg p-6">
          <Link
            href="/wallet"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to wallet
          </Link>
          <h1 className="mb-3 text-xl font-semibold">Deposit naira</h1>
          <Switch tab={tab} setTab={setTab} />
          <div className="mt-4">
            <NairaDepositPanel />
          </div>
        </div>
      )}
    </div>
  );
}

function Switch({
  tab,
  setTab,
}: {
  tab: "crypto" | "naira";
  setTab: (t: "crypto" | "naira") => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-[var(--color-border)] p-1">
      {(["crypto", "naira"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTab(t)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition",
            tab === t
              ? "bg-[var(--color-accent)] text-white"
              : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
