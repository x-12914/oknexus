"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, ScrollText, Megaphone, Plus } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { OrderSide, P2PAd, P2PPaymentMethod } from "@/lib/exchange/types";
import { MerchantBadge } from "./MerchantBadge";
import { OpenTradeDialog } from "./OpenTradeDialog";
import { PostAdDialog } from "./PostAdDialog";

const ASSETS = ["USDT", "BTC", "ETH"];
const FIATS = ["USD", "NGN", "EUR"];

// Taker-perspective tab → advertiser side to query.
// "Buy" = I buy crypto = merchant sells (ad.side SELL).
const TAB_TO_SIDE: Record<"BUY" | "SELL", OrderSide> = { BUY: "SELL", SELL: "BUY" };

export function P2PMarketplace() {
  const [tab, setTab] = useState<"BUY" | "SELL">("BUY");
  const [asset, setAsset] = useState("USDT");
  const [fiat, setFiat] = useState("USD");
  const [method, setMethod] = useState<string>("");
  const [methods, setMethods] = useState<P2PPaymentMethod[]>([]);
  const [ads, setAds] = useState<P2PAd[] | null>(null);
  const [activeAd, setActiveAd] = useState<P2PAd | null>(null);
  const [showPost, setShowPost] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.p2pPaymentMethods().then((r) => setMethods(r.methods)).catch(() => {});
  }, []);

  const methodName = useMemo(() => {
    const map = new Map(methods.map((m) => [m.id, m.name]));
    return (id: string) => map.get(id) ?? id;
  }, [methods]);

  useEffect(() => {
    let cancelled = false;
    api
      .p2pAds({ side: TAB_TO_SIDE[tab], asset, fiat, method: method || undefined })
      .then((r) => {
        if (!cancelled) setAds(r.ads);
      })
      .catch(() => {
        if (!cancelled) setAds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, asset, fiat, method, refreshKey]);

  const takerBuys = tab === "BUY";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">P2P Trading</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Trade directly with other users. Every trade is escrow-protected.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/p2p/orders"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-surface-2)]"
          >
            <ScrollText className="h-4 w-4" /> My Trades
          </Link>
          <Link
            href="/p2p/my-ads"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-surface-2)]"
          >
            <Megaphone className="h-4 w-4" /> My Ads
          </Link>
          <button
            type="button"
            onClick={() => setShowPost(true)}
            className="btn-brand inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Post ad
          </button>
        </div>
      </div>

      {/* Buy / Sell tabs */}
      <div className="inline-flex rounded-lg bg-[var(--color-surface-2)] p-1 mb-4">
        {(["BUY", "SELL"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "px-6 py-2 rounded-md text-sm font-medium transition-colors",
              tab === t
                ? t === "BUY"
                  ? "bg-[var(--color-up)] text-black"
                  : "bg-[var(--color-down)] text-white"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            )}
          >
            {t === "BUY" ? "Buy" : "Sell"}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <FilterGroup label="Asset" value={asset} options={ASSETS} onChange={setAsset} />
        <FilterGroup label="Fiat" value={fiat} options={FIATS} onChange={setFiat} />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--color-muted)]">Pay</span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm outline-none"
          >
            <option value="">All methods</option>
            {methods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ad list */}
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.4fr_1fr_1.2fr_auto] gap-3 px-4 py-2 text-xs text-[var(--color-muted)] border-b border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <span>Advertiser</span>
          <span>Price</span>
          <span>Available / Limit</span>
          <span className="text-right">Trade</span>
        </div>

        {ads === null ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[var(--color-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading offers…
          </div>
        ) : ads.length === 0 ? (
          <div className="py-16 text-center text-[var(--color-muted)]">
            No offers match these filters.
          </div>
        ) : (
          ads.map((ad) => (
            <div
              key={ad.id}
              className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1.2fr_auto] gap-3 px-4 py-4 border-b border-[var(--color-border)] last:border-0 items-center"
            >
              <MerchantBadge merchant={ad.merchant} />

              <div>
                <div className="text-lg font-semibold tabular-nums">
                  {ad.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                  <span className="text-xs font-normal text-[var(--color-muted)]">{ad.fiat}</span>
                </div>
              </div>

              <div className="text-sm">
                <div className="tabular-nums">
                  {ad.available.toLocaleString()} {ad.asset}
                </div>
                <div className="text-xs text-[var(--color-muted)] tabular-nums">
                  {ad.minLimit.toLocaleString()}–{ad.maxLimit.toLocaleString()} {ad.fiat}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {ad.paymentMethods.map((m) => (
                    <span
                      key={m}
                      className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)]"
                    >
                      {methodName(m)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="md:text-right">
                <button
                  type="button"
                  onClick={() => setActiveAd(ad)}
                  className={cn(
                    "px-5 py-2 rounded-lg text-sm font-medium",
                    takerBuys
                      ? "bg-[var(--color-up)] text-black hover:opacity-90"
                      : "bg-[var(--color-down)] text-white hover:opacity-90",
                  )}
                >
                  {takerBuys ? "Buy" : "Sell"} {ad.asset}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {activeAd ? (
        <OpenTradeDialog
          ad={activeAd}
          methodName={methodName}
          onClose={() => setActiveAd(null)}
        />
      ) : null}

      {showPost ? (
        <PostAdDialog
          onClose={() => setShowPost(false)}
          onPosted={() => setRefreshKey((k) => k + 1)}
        />
      ) : null}
    </div>
  );
}

function FilterGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-[var(--color-muted)]">{label}</span>
      <div className="flex rounded-md bg-[var(--color-surface-2)] p-0.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium",
              value === o
                ? "bg-[var(--color-surface)] text-[var(--color-foreground)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
