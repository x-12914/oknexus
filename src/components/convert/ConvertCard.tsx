"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownUp, Loader2, CheckCircle2, Zap, Building2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { SwapAsset, SwapQuote, OtcQuote } from "@/lib/exchange/types";
import { AssetSelect, AssetCoin } from "@/components/swap/AssetSelect";

const SETTLE = "USDT";

function smartQty(v: number): string {
  const decimals = v >= 1000 ? 2 : v >= 1 ? 4 : 6;
  return v.toLocaleString(undefined, { maximumFractionDigits: decimals });
}
function usd0(v: number): string {
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

type Quote = { kind: "instant"; swap: SwapQuote } | { kind: "otc"; otc: OtcQuote };

/**
 * Unified conversion surface — merges Instant Swap + OTC into one size-routing flow.
 * Small orders execute instantly; orders at/above the OTC notional (with a USDT leg)
 * auto-route to a firm OTC-desk quote with a tighter spread. Same inputs either way.
 */
export function ConvertCard() {
  const [assets, setAssets] = useState<SwapAsset[]>([]);
  const [otcMin, setOtcMin] = useState(50_000);
  const [fromSymbol, setFromSymbol] = useState("USDT");
  const [toSymbol, setToSymbol] = useState("BTC");
  const [fromAmount, setFromAmount] = useState("");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [executing, setExecuting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    api.swapAssets().then((r) => setAssets(r.assets)).catch(() => {});
    api.otcConfig().then((c) => setOtcMin(c.minNotional)).catch(() => {});
  }, []);

  const loadBalances = useCallback(() => {
    api
      .wallet()
      .then((p) => setBalances(Object.fromEntries(p.items.map((i) => [i.symbol, i.balance]))))
      .catch(() => setBalances(null));
  }, []);
  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  const amountNum = Number(fromAmount);
  const fromAsset = assets.find((a) => a.symbol === fromSymbol);
  const notionalUsd = amountNum > 0 && fromAsset ? amountNum * fromAsset.usdtPrice : 0;
  const balance = balances?.[fromSymbol] ?? 0;
  const insufficient = balances != null && amountNum > balance;

  // OTC routing: large enough, a USDT leg (OTC settles in USDT), and a real pair.
  const otcEligible =
    fromSymbol !== toSymbol &&
    notionalUsd >= otcMin &&
    (fromSymbol === SETTLE || toSymbol === SETTLE);

  const fetchQuote = useCallback(
    async (silent = false) => {
      if (!(amountNum > 0) || fromSymbol === toSymbol) {
        setQuote(null);
        return;
      }
      if (!silent) setLoadingQuote(true);
      setError(null);
      try {
        if (otcEligible) {
          const side = fromSymbol === SETTLE ? "BUY" : "SELL";
          const base = fromSymbol === SETTLE ? toSymbol : fromSymbol;
          const baseAsset = assets.find((a) => a.symbol === base);
          const baseAmount = side === "SELL" ? amountNum : amountNum / (baseAsset?.usdtPrice || 1);
          const otc = await api.otcQuote({ side, baseSymbol: base, settleCurrency: SETTLE, baseAmount });
          setQuote({ kind: "otc", otc });
          setSecondsLeft(Math.max(0, Math.ceil((otc.expiresAt - Date.now()) / 1000)));
        } else {
          const swap = await api.swapQuote(fromSymbol, toSymbol, amountNum);
          setQuote({ kind: "instant", swap });
          setSecondsLeft(Math.max(0, Math.ceil((swap.expiresAt - Date.now()) / 1000)));
        }
      } catch (e) {
        setError((e as Error).message);
        setQuote(null);
      } finally {
        setLoadingQuote(false);
      }
    },
    [amountNum, fromSymbol, toSymbol, otcEligible, assets],
  );

  useEffect(() => {
    const t = setTimeout(() => fetchQuote(false), 400);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  const fetchRef = useRef(fetchQuote);
  useEffect(() => {
    fetchRef.current = fetchQuote;
  }, [fetchQuote]);

  const expiresAt = quote ? (quote.kind === "otc" ? quote.otc.expiresAt : quote.swap.expiresAt) : 0;
  useEffect(() => {
    if (!quote) return;
    const id = setInterval(() => {
      const left = Math.ceil((expiresAt - Date.now()) / 1000);
      if (left <= 0) fetchRef.current(true);
      else setSecondsLeft(left);
    }, 250);
    return () => clearInterval(id);
  }, [quote, expiresAt]);

  // Derived display values.
  let receiveAmount = 0;
  let firmPay: number | null = null; // OTC BUY: the firm USDT cost (differs from typed estimate)
  if (quote?.kind === "instant") {
    receiveAmount = quote.swap.toAmount;
  } else if (quote?.kind === "otc") {
    const o = quote.otc;
    if (o.side === "SELL") receiveAmount = o.totalCost; // receive USDT
    else {
      receiveAmount = o.baseAmount; // receive the base crypto
      firmPay = o.totalCost; // pay this much USDT
    }
  }

  const flip = () => {
    setSuccess(null);
    setFromSymbol(toSymbol);
    setToSymbol(fromSymbol);
    setFromAmount("");
    setQuote(null);
  };
  const setMax = () => {
    setSuccess(null);
    setFromAmount(String(balance));
  };
  const changeFrom = (s: string) => {
    setSuccess(null);
    setFromSymbol(s);
    setQuote(null);
  };
  const changeTo = (s: string) => {
    setSuccess(null);
    setToSymbol(s);
    setQuote(null);
  };

  const execute = async () => {
    if (!quote) return;
    setExecuting(true);
    setError(null);
    setSuccess(null);
    try {
      if (quote.kind === "instant") {
        const res = await api.swapExecute(quote.swap.quoteId);
        setSuccess(
          `Converted ${smartQty(res.fromAmount)} ${res.fromSymbol} → ${smartQty(res.toAmount)} ${res.toSymbol}`,
        );
      } else {
        const res = await api.otcAccept(quote.otc.quoteId);
        const settled =
          res.side === "SELL"
            ? `${smartQty(res.totalCost)} ${res.settleCurrency}`
            : `${smartQty(res.baseAmount)} ${res.baseSymbol}`;
        setSuccess(
          `OTC ${res.side === "SELL" ? "sold" : "bought"} ${smartQty(res.baseAmount)} ${res.baseSymbol} → ${settled}`,
        );
      }
      setFromAmount("");
      setQuote(null);
      loadBalances();
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      if (msg === "Quote expired") fetchQuote(false);
    } finally {
      setExecuting(false);
    }
  };

  const canConvert = quote && !insufficient && !executing && amountNum > 0;
  const isOtc = quote?.kind === "otc";

  return (
    <div className="w-full max-w-md rounded-2xl glass p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Convert</h1>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
            isOtc
              ? "bg-[var(--color-accent)]/12 text-[var(--color-accent)]"
              : "bg-[var(--color-surface-2)] text-[var(--color-muted)]",
          )}
        >
          {isOtc ? <Building2 className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
          {isOtc ? "OTC desk" : "Instant"}
        </span>
      </div>

      {/* From */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
        <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>You pay</span>
          <button type="button" onClick={setMax} className="hover:text-[var(--color-foreground)]">
            Balance: {smartQty(balance)} {fromSymbol}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={fromAmount}
            onChange={(e) => {
              setSuccess(null);
              setFromAmount(e.target.value.replace(/[^0-9.]/g, ""));
            }}
            placeholder="0.0"
            className={cn(
              "min-w-0 flex-1 bg-transparent text-2xl font-medium tabular-nums outline-none",
              insufficient ? "text-[var(--color-down)]" : "text-[var(--color-foreground)]",
            )}
          />
          <AssetSelect assets={assets} value={fromSymbol} exclude={toSymbol} onChange={changeFrom} />
        </div>
        {notionalUsd > 0 ? (
          <div className="mt-1 text-right text-[11px] text-[var(--color-muted)]">
            ≈ ${usd0(notionalUsd)}
          </div>
        ) : null}
      </div>

      {/* Flip */}
      <div className="relative z-10 -my-2 flex justify-center">
        <button
          type="button"
          onClick={flip}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 hover:bg-[var(--color-surface-2)]"
          aria-label="Flip direction"
        >
          <ArrowDownUp className="h-4 w-4" />
        </button>
      </div>

      {/* To */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
        <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-muted)]">
          <span>You receive</span>
          <span>
            Balance: {smartQty(balances?.[toSymbol] ?? 0)} {toSymbol}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 text-2xl font-medium tabular-nums">
            {quote ? (
              smartQty(receiveAmount)
            ) : loadingQuote ? (
              <span className="text-[var(--color-muted)]">…</span>
            ) : (
              <span className="text-[var(--color-muted)]">0.0</span>
            )}
          </div>
          <AssetSelect assets={assets} value={toSymbol} exclude={fromSymbol} onChange={changeTo} />
        </div>
      </div>

      {/* Quote details */}
      {quote?.kind === "instant" ? (
        <div className="mt-3 space-y-1.5 text-xs">
          <Row label="Rate">
            <span className="tabular-nums">
              1 {quote.swap.fromSymbol} = {smartQty(quote.swap.rate)} {quote.swap.toSymbol}
            </span>
          </Row>
          <Row label="Price impact">
            <span
              className={cn(
                "tabular-nums",
                quote.swap.priceImpactPct > 1 ? "text-[var(--color-down)]" : "text-[var(--color-up)]",
              )}
            >
              {quote.swap.priceImpactPct.toFixed(2)}%
            </span>
          </Row>
          <Row label="Fee (0.30%)">
            <span className="tabular-nums">
              {smartQty(quote.swap.feeAmount)} {quote.swap.feeSymbol}
            </span>
          </Row>
          <Row label="Quote refresh">
            <span className="tabular-nums text-[var(--color-muted)]">{secondsLeft}s</span>
          </Row>
        </div>
      ) : quote?.kind === "otc" ? (
        <div className="mt-3 space-y-1.5 text-xs">
          <Row label="OTC price">
            <span className="tabular-nums">
              {smartQty(quote.otc.price)} {quote.otc.settleCurrency}
            </span>
          </Row>
          <Row label="Desk spread">
            <span className="tabular-nums">
              {quote.otc.spreadPct.toFixed(2)}% · {quote.otc.tierLabel}
            </span>
          </Row>
          {firmPay != null ? (
            <Row label="You pay (firm)">
              <span className="tabular-nums">
                {smartQty(firmPay)} {SETTLE}
              </span>
            </Row>
          ) : null}
          {quote.otc.savings > 0 ? (
            <Row label="Saved vs spot">
              <span className="tabular-nums text-[var(--color-up)]">
                ~${usd0(quote.otc.savings)}
              </span>
            </Row>
          ) : null}
          <Row label="Quote firm for">
            <span className="tabular-nums text-[var(--color-muted)]">{secondsLeft}s</span>
          </Row>
        </div>
      ) : null}

      {error ? <div className="mt-3 text-sm text-[var(--color-down)]">{error}</div> : null}
      {success ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-[var(--color-up)]">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </div>
      ) : null}

      <button
        type="button"
        disabled={!canConvert}
        onClick={execute}
        className={cn(
          "mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-medium",
          canConvert
            ? "btn-brand"
            : "cursor-not-allowed bg-[var(--color-surface-2)] text-[var(--color-muted)]",
        )}
      >
        {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {insufficient
          ? `Insufficient ${fromSymbol}`
          : !amountNum
            ? "Enter an amount"
            : !quote
              ? "Fetching quote…"
              : executing
                ? "Settling…"
                : isOtc
                  ? "Settle via OTC desk"
                  : "Convert"}
      </button>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[var(--color-muted)]">
        <AssetCoin symbol={fromSymbol} size={14} />
        {isOtc
          ? "Large order · firm OTC pricing · settles to your OKNexus wallet"
          : "Instant · live pricing · settles to your OKNexus wallet"}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-muted)]">{label}</span>
      {children}
    </div>
  );
}
