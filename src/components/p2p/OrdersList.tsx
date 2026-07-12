"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, ChevronRight } from "lucide-react";
import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { cn } from "@/lib/utils";
import type { P2POrderStatus } from "@/lib/exchange/types";

const STATUS_LABEL: Record<P2POrderStatus, { label: string; cls: string }> = {
  PENDING_PAYMENT: { label: "Awaiting payment", cls: "text-[var(--color-accent)]" },
  PAID: { label: "Awaiting release", cls: "text-amber-400" },
  COMPLETED: { label: "Completed", cls: "text-[var(--color-up)]" },
  CANCELLED: { label: "Cancelled", cls: "text-[var(--color-muted)]" },
  DISPUTED: { label: "Disputed", cls: "text-[var(--color-down)]" },
};

export function OrdersList() {
  const { data } = usePolling(() => api.p2pOrders(), 4000, []);
  const orders = data?.orders ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link
        href="/p2p"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Link>
      <h1 className="text-xl font-semibold mb-4">My Trades</h1>

      {!data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[var(--color-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] py-16 text-center text-[var(--color-muted)]">
          No trades yet. Open one from the{" "}
          <Link href="/p2p" className="text-[var(--color-accent)] hover:underline">
            marketplace
          </Link>
          .
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
          {orders.map((o) => {
            const s = STATUS_LABEL[o.status];
            const takerBuys = o.takerRole === "buyer";
            return (
              <Link
                key={o.id}
                href={`/p2p/order/${o.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)]"
              >
                <div className="min-w-0">
                  <div className="font-medium">
                    <span className={takerBuys ? "text-[var(--color-up)]" : "text-[var(--color-down)]"}>
                      {takerBuys ? "Buy" : "Sell"}
                    </span>{" "}
                    {o.assetAmount.toLocaleString(undefined, { maximumFractionDigits: 8 })}{" "}
                    {o.asset}
                  </div>
                  <div className="text-xs text-[var(--color-muted)]">
                    {o.fiatAmount.toLocaleString()} {o.fiat} · with {o.merchant.name}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs font-medium", s.cls)}>{s.label}</span>
                  <ChevronRight className="h-4 w-4 text-[var(--color-muted)]" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
