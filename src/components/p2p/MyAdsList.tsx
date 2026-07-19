"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { cn } from "@/lib/utils";
import { AssetCoin } from "@/components/swap/AssetSelect";
import { PostAdDialog } from "./PostAdDialog";

export function MyAdsList() {
  const { data, refresh } = usePolling(() => api.p2pMyAds(), 6000, []);
  const [showPost, setShowPost] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const ads = data?.ads ?? [];

  const remove = async (id: string) => {
    setRemoving(id);
    try {
      await api.p2pDeleteAd(id);
      refresh();
    } catch {
      // surfaced on next poll
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link
        href="/p2p"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Link>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">My Ads</h1>
        <button
          type="button"
          onClick={() => setShowPost(true)}
          className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Post ad
        </button>
      </div>

      {!data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[var(--color-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : ads.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] py-16 text-center text-[var(--color-muted)]">
          You haven&apos;t posted any ads yet. Click{" "}
          <span className="text-[var(--color-foreground)]">Post ad</span> to list a buy or sell
          offer.
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className="grid grid-cols-[auto_1fr_auto] gap-3 px-4 py-3 border-b border-[var(--color-border)] last:border-0 items-center"
            >
              <div className="flex items-center gap-2.5">
                <AssetCoin symbol={ad.asset} size={30} />
                <div>
                  <div className="text-sm font-medium">
                    <span
                      className={
                        ad.side === "SELL" ? "text-[var(--color-down)]" : "text-[var(--color-up)]"
                      }
                    >
                      {ad.side === "SELL" ? "Sell" : "Buy"}
                    </span>{" "}
                    {ad.asset} / {ad.fiat}
                  </div>
                  <div className="text-xs text-[var(--color-muted)] tabular-nums">
                    {ad.price.toLocaleString(undefined, { maximumFractionDigits: 4 })} {ad.fiat} ·{" "}
                    {ad.available.toLocaleString(undefined, { maximumFractionDigits: 8 })} {ad.asset}{" "}
                    left
                  </div>
                </div>
              </div>

              <div className="text-xs text-[var(--color-muted)] hidden sm:block">
                {ad.minLimit.toLocaleString()}–{ad.maxLimit.toLocaleString()} {ad.fiat}
              </div>

              <div className="flex items-center gap-3 justify-end">
                <span
                  className={cn(
                    "text-xs font-medium",
                    ad.active ? "text-[var(--color-up)]" : "text-[var(--color-muted)]",
                  )}
                >
                  {ad.active ? "Active" : "Closed"}
                </span>
                {ad.active ? (
                  <button
                    type="button"
                    onClick={() => remove(ad.id)}
                    disabled={removing === ad.id}
                    className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-down)] disabled:opacity-50"
                  >
                    {removing === ad.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-[var(--color-muted)]">
        Removing a sell ad returns its unreserved crypto to your available balance. Trades already in
        progress continue to completion.
      </p>

      {showPost ? <PostAdDialog onClose={() => setShowPost(false)} onPosted={refresh} /> : null}
    </div>
  );
}
