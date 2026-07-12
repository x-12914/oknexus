"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownUp, Settings2, Loader2, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { SwapAsset, SwapQuote } from "@/lib/exchange/types";
import { AssetSelect, AssetCoin } from "./AssetSelect";

// Demo balances until wallets are wired to the DB.
const DEMO_BALANCES: Record<string, number> = {
  USDT: 10000,
  BTC: 0.15,
  ETH: 2.5,
  SOL: 40,
  BNB: 5,
  XRP: 5000,
  ADA: 8000,
};

const SLIPPAGE_OPTIONS = [0.1, 0.5, 1.0];

function smartQty(v: number): string {
  const decimals = v >= 1000 ? 2 : v >= 1 ? 4 : 6;
  return v.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

export function SwapCard() {
  const [assets, setAssets] = useState<SwapAsset[]>([]);
  const [fromSymbol, setFromSymbol] = useState("USDT");
  const [toSymbol, setToSymbol] = useState("BTC");
  const [fromAmount, setFromAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);

  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const [executing, setExecuting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api.swapAssets().then((r) => setAssets(r.assets)).catch(() => {});
  }, []);

  const amountNum = Number(fromAmount);
  const balance = DEMO_BALANCES[fromSymbol] ?? 0;
  const insufficient = amountNum > balance;

  const fetchQuote = useCallback(
    async (silent = false) => {
      if (!(amountNum > 0) || fromSymbol === toSymbol) {
        setQuote(null);
        return;
      }
      if (!silent) setLoadingQuote(true);
      setError(null);
      try {
        const q = await api.swapQuote(fromSymbol, toSymbol, amountNum);
        setQuote(q);
        setSecondsLeft(Math.max(0, Math.ceil((q.expiresAt - Date.now()) / 1000)));
      } catch (e) {
        setError((e as Error).message);
        setQuote(null);
      } finally {
        setLoadingQuote(false);
      }
    },
    [amountNum, fromSymbol, toSymbol],
  );

  // Debounced quote fetch on input change. (Success is cleared by user
  // interaction, not here, so the confirmation survives the post-swap reset.)
  useEffect(() => {
    const t = setTimeout(() => fetchQuote(false), 400);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  // Keep the latest fetcher in a ref so the interval below can trigger a
  // silent re-quote without re-subscribing every render.
  const fetchRef = useRef(fetchQuote);
  useEffect(() => {
    fetchRef.current = fetchQuote;
  }, [fetchQuote]);

  // Countdown + silent auto-refresh when the locked quote expires. secondsLeft
  // is seeded when the quote is set, so the interval only advances it.
  useEffect(() => {
    if (!quote) return;
    const id = setInterval(() => {
      const left = Math.ceil((quote.expiresAt - Date.now()) / 1000);
      if (left <= 0) {
        fetchRef.current(true);
      } else {
        setSecondsLeft(left);
      }
    }, 250);
    return () => clearInterval(id);
  }, [quote]);

  const flip = () => {
    const prevTo = quote?.toAmount;
    setSuccess(null);
    setFromSymbol(toSymbol);
    setToSymbol(fromSymbol);
    setFromAmount(prevTo ? String(Number(prevTo.toFixed(8))) : fromAmount);
    setQuote(null);
  };

  const setMax = () => {
    setSuccess(null);
    setFromAmount(String(balance));
  };

  const changeFrom = (s: string) => {
    setSuccess(null);
    setFromSymbol(s);
  };
  const changeTo = (s: string) => {
    setSuccess(null);
    setToSymbol(s);
  };

  const minReceived = quote ? quote.toAmount * (1 - slippage / 100) : 0;

  const execute = async () => {
    if (!quote) return;
    setExecuting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.swapExecute(quote.quoteId);
      setSuccess(
        `Swapped ${smartQty(res.fromAmount)} ${res.fromSymbol} → ${smartQty(res.toAmount)} ${res.toSymbol}`,
      );
      setFromAmount("");
      setQuote(null);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      if (msg === "Quote expired") fetchQuote(false);
    } finally {
      setExecuting(false);
    }
  };

  const canSwap = quote && !insufficient && !executing && amountNum > 0;

  return (
    <div className="w-full max-w-md rounded-2xl glass p-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold">Instant Swap</h1>
        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          className="p-2 rounded-md text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
          aria-label="Settings"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      {showSettings ? (
        <div className="mb-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
          <div className="text-xs text-[var(--color-muted)] mb-2">Max slippage</div>
          <div className="flex items-center gap-2">
            {SLIPPAGE_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlippage(s)}
                className={cn(
                  "px-3 py-1 rounded-md text-sm border",
                  slippage === s
                    ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                )}
              >
                {s}%
              </button>
            ))}
            <div className="flex items-center rounded-md border border-[var(--color-border)] px-2">
              <input
                type="text"
                inputMode="decimal"
                value={String(slippage)}
                onChange={(e) => {
                  const v = Number(e.target.value.replace(/[^0-9.]/g, ""));
                  if (!Number.isNaN(v)) setSlippage(v);
                }}
                className="w-12 bg-transparent py-1 text-sm text-right outline-none"
              />
              <span className="text-sm text-[var(--color-muted)]">%</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* From */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
        <div className="flex items-center justify-between text-xs text-[var(--color-muted)] mb-1">
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
              "flex-1 min-w-0 bg-transparent text-2xl font-medium tabular-nums outline-none",
              insufficient ? "text-[var(--color-down)]" : "text-[var(--color-foreground)]",
            )}
          />
          <AssetSelect
            assets={assets}
            value={fromSymbol}
            exclude={toSymbol}
            onChange={changeFrom}
          />
        </div>
      </div>

      {/* Flip */}
      <div className="flex justify-center -my-2 relative z-10">
        <button
          type="button"
          onClick={flip}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 hover:bg-[var(--color-surface-2)]"
          aria-label="Swap direction"
        >
          <ArrowDownUp className="h-4 w-4" />
        </button>
      </div>

      {/* To */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
        <div className="flex items-center justify-between text-xs text-[var(--color-muted)] mb-1">
          <span>You receive</span>
          <span>
            Balance: {smartQty(DEMO_BALANCES[toSymbol] ?? 0)} {toSymbol}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 text-2xl font-medium tabular-nums">
            {quote ? (
              smartQty(quote.toAmount)
            ) : loadingQuote ? (
              <span className="text-[var(--color-muted)]">…</span>
            ) : (
              <span className="text-[var(--color-muted)]">0.0</span>
            )}
          </div>
          <AssetSelect
            assets={assets}
            value={toSymbol}
            exclude={fromSymbol}
            onChange={changeTo}
          />
        </div>
      </div>

      {/* Quote details */}
      {quote ? (
        <div className="mt-3 space-y-1.5 text-xs">
          <Row label="Rate">
            <span className="tabular-nums">
              1 {quote.fromSymbol} = {smartQty(quote.rate)} {quote.toSymbol}
            </span>
          </Row>
          <Row label="Price impact">
            <span
              className={cn(
                "tabular-nums",
                quote.priceImpactPct > 1 ? "text-[var(--color-down)]" : "text-[var(--color-up)]",
              )}
            >
              {quote.priceImpactPct.toFixed(2)}%
            </span>
          </Row>
          <Row label="Fee (0.30%)">
            <span className="tabular-nums">
              {smartQty(quote.feeAmount)} {quote.feeSymbol}
            </span>
          </Row>
          <Row label={`Min received (${slippage}% slippage)`}>
            <span className="tabular-nums">
              {smartQty(minReceived)} {quote.toSymbol}
            </span>
          </Row>
          <Row label="Quote refresh">
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
        disabled={!canSwap}
        onClick={execute}
        className={cn(
          "mt-4 w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2",
          canSwap
            ? "btn-brand"
            : "bg-[var(--color-surface-2)] text-[var(--color-muted)] cursor-not-allowed",
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
                ? "Swapping…"
                : "Swap"}
      </button>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[var(--color-muted)]">
        <AssetCoin symbol={fromSymbol} size={14} />
        Routed via mock connector · demo balances
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
