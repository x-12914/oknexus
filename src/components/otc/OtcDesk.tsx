"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, CheckCircle2, ShieldCheck, TrendingDown } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type {
  OrderSide,
  OtcConfig,
  OtcQuote,
  OtcResult,
  SwapAsset,
} from "@/lib/exchange/types";
import { AssetSelect } from "@/components/swap/AssetSelect";

type Phase = "idle" | "quoting" | "quoted" | "expired" | "accepting" | "done";

const QUOTE_WINDOW = 30; // seconds, matches the mock's firm window

function smartQty(v: number): string {
  const decimals = v >= 1000 ? 2 : v >= 1 ? 4 : 6;
  return v.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

export function OtcDesk() {
  const [config, setConfig] = useState<OtcConfig | null>(null);
  const [assets, setAssets] = useState<SwapAsset[]>([]);

  const [side, setSide] = useState<OrderSide>("BUY");
  const [baseSymbol, setBaseSymbol] = useState("BTC");
  const [settleCurrency, setSettleCurrency] = useState("USDT");
  const [amount, setAmount] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [quote, setQuote] = useState<OtcQuote | null>(null);
  const [result, setResult] = useState<OtcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    api.otcConfig().then(setConfig).catch(() => {});
    api.swapAssets().then((r) => setAssets(r.assets)).catch(() => {});
  }, []);

  const priceMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of assets) m[a.symbol] = a.usdtPrice;
    return m;
  }, [assets]);

  const otcAssets = useMemo(
    () => assets.filter((a) => config?.baseSymbols.includes(a.symbol)),
    [assets, config],
  );

  const amountNum = Number(amount);
  const refPrice = priceMap[baseSymbol] ?? 0;
  const notionalPreview = amountNum * refPrice;
  const minNotional = config?.minNotional ?? 50_000;
  const belowMin = amountNum > 0 && notionalPreview < minNotional;

  const fmtSettle = (v: number) =>
    settleCurrency === "USD"
      ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;

  // Any parameter change invalidates a standing quote.
  const resetQuote = () => {
    setPhase("idle");
    setQuote(null);
    setResult(null);
    setError(null);
  };

  // Countdown for the firm quote window; expires without auto-refresh (RFQ).
  useEffect(() => {
    if (phase !== "quoted" || !quote) return;
    const id = setInterval(() => {
      const left = Math.ceil((quote.expiresAt - Date.now()) / 1000);
      if (left <= 0) {
        setSecondsLeft(0);
        setPhase("expired");
      } else {
        setSecondsLeft(left);
      }
    }, 250);
    return () => clearInterval(id);
  }, [phase, quote]);

  const requestQuote = async () => {
    if (!(amountNum > 0) || belowMin) return;
    setPhase("quoting");
    setError(null);
    setResult(null);
    try {
      const q = await api.otcQuote({ side, baseSymbol, settleCurrency, baseAmount: amountNum });
      setQuote(q);
      setSecondsLeft(Math.max(0, Math.ceil((q.expiresAt - Date.now()) / 1000)));
      setPhase("quoted");
    } catch (e) {
      setError((e as Error).message);
      setPhase("idle");
    }
  };

  const accept = async () => {
    if (!quote) return;
    setPhase("accepting");
    setError(null);
    try {
      const res = await api.otcAccept(quote.quoteId);
      setResult(res);
      setPhase("done");
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      setPhase(msg === "Quote expired" ? "expired" : "quoted");
    }
  };

  const showForm = phase === "idle" || phase === "quoting" || phase === "expired";
  const showTicket = phase === "quoted" || phase === "accepting";

  return (
    <div className="w-full max-w-lg rounded-2xl glass p-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold">OTC Trading Desk</h1>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Large-block execution with minimal market impact
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-1 text-[10px] text-[var(--color-muted)]">
          <ShieldCheck className="h-3 w-3" /> RFQ · firm 30s
        </span>
      </div>

      <div className="mt-2 text-[11px] text-[var(--color-muted)]">
        Minimum{" "}
        <span className="text-[var(--color-foreground)] font-medium">
          ${minNotional.toLocaleString()}
        </span>{" "}
        per trade · settled off the public order book
      </div>

      {showForm ? (
        <div className="mt-4 space-y-3">
          {/* Buy / Sell */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--color-surface-2)] p-1">
            {(["BUY", "SELL"] as OrderSide[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSide(s);
                  resetQuote();
                }}
                className={cn(
                  "py-2 rounded-md text-sm font-medium transition-colors",
                  side === s
                    ? s === "BUY"
                      ? "bg-[var(--color-up)] text-black"
                      : "bg-[var(--color-down)] text-white"
                    : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                )}
              >
                {s === "BUY" ? "Buy" : "Sell"}
              </button>
            ))}
          </div>

          {/* Amount + asset */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
            <div className="flex items-center justify-between text-xs text-[var(--color-muted)] mb-1">
              <span>{side === "BUY" ? "Amount to buy" : "Amount to sell"}</span>
              <span>
                ≈{" "}
                <span className={cn(belowMin && "text-[var(--color-down)]")}>
                  {refPrice ? fmtSettle(notionalPreview) : "—"}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value.replace(/[^0-9.]/g, ""));
                  resetQuote();
                }}
                placeholder="0.0"
                className="flex-1 min-w-0 bg-transparent text-2xl font-medium tabular-nums outline-none"
              />
              <AssetSelect
                assets={otcAssets}
                value={baseSymbol}
                onChange={(s) => {
                  setBaseSymbol(s);
                  resetQuote();
                }}
              />
            </div>
          </div>

          {/* Settle currency */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-muted)]">Settle in</span>
            <div className="flex gap-1 rounded-lg bg-[var(--color-surface-2)] p-1">
              {(config?.settleCurrencies ?? ["USDT", "USD"]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setSettleCurrency(c);
                    resetQuote();
                  }}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium",
                    settleCurrency === c
                      ? "bg-[var(--color-surface)] text-[var(--color-foreground)]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {belowMin ? (
            <div className="text-xs text-[var(--color-down)]">
              Below the ${minNotional.toLocaleString()} desk minimum. For smaller sizes use{" "}
              <span className="underline">Spot</span> or <span className="underline">Swap</span>.
            </div>
          ) : null}
          {error ? <div className="text-sm text-[var(--color-down)]">{error}</div> : null}

          <button
            type="button"
            disabled={!(amountNum > 0) || belowMin || phase === "quoting"}
            onClick={requestQuote}
            className={cn(
              "w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2",
              amountNum > 0 && !belowMin
                ? "btn-brand"
                : "bg-[var(--color-surface-2)] text-[var(--color-muted)] cursor-not-allowed",
            )}
          >
            {phase === "quoting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {phase === "quoting"
              ? "Requesting quote…"
              : phase === "expired"
                ? "Request New Quote"
                : "Request Quote"}
          </button>
        </div>
      ) : null}

      {showTicket && quote ? (
        <QuoteTicket
          quote={quote}
          side={side}
          secondsLeft={secondsLeft}
          accepting={phase === "accepting"}
          error={error}
          fmtSettle={fmtSettle}
          onAccept={accept}
          onDecline={resetQuote}
        />
      ) : null}

      {phase === "done" && result ? (
        <div className="mt-4 rounded-xl border border-[var(--color-up)]/40 bg-[var(--color-up)]/5 p-4">
          <div className="flex items-center gap-2 text-[var(--color-up)] font-medium">
            <CheckCircle2 className="h-5 w-5" /> Block trade settled
          </div>
          <div className="mt-2 text-sm">
            {result.side === "BUY" ? "Bought" : "Sold"}{" "}
            <span className="font-medium">
              {smartQty(result.baseAmount)} {result.baseSymbol}
            </span>{" "}
            @ {fmtSettle(result.price)}
          </div>
          <div className="text-sm text-[var(--color-muted)]">
            {result.side === "BUY" ? "Total paid" : "Total received"}:{" "}
            <span className="text-[var(--color-foreground)]">{fmtSettle(result.totalCost)}</span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-muted)]">
            Ref {result.id} · executed off-book
          </div>
          <button
            type="button"
            onClick={resetQuote}
            className="mt-3 w-full py-2.5 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-surface-2)]"
          >
            New quote
          </button>
        </div>
      ) : null}
    </div>
  );
}

function QuoteTicket({
  quote,
  side,
  secondsLeft,
  accepting,
  error,
  fmtSettle,
  onAccept,
  onDecline,
}: {
  quote: OtcQuote;
  side: OrderSide;
  secondsLeft: number;
  accepting: boolean;
  error: string | null;
  fmtSettle: (v: number) => string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const pct = Math.max(0, Math.min(100, (secondsLeft / QUOTE_WINDOW) * 100));

  return (
    <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--color-muted)]">
          {side === "BUY" ? "Buy" : "Sell"}{" "}
          <span className="text-[var(--color-foreground)] font-medium">
            {quote.baseAmount.toLocaleString()} {quote.baseSymbol}
          </span>
        </div>
        <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-muted)]">
          {quote.tierLabel}
        </span>
      </div>

      <div className="mt-2 text-3xl font-semibold tabular-nums">{fmtSettle(quote.price)}</div>
      <div className="text-xs text-[var(--color-muted)]">
        Firm price per {quote.baseSymbol} · spread {quote.spreadPct.toFixed(2)}%
      </div>

      <div className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--color-muted)]">Reference (mid)</span>
          <span className="tabular-nums">{fmtSettle(quote.referencePrice)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-muted)]">
            {side === "BUY" ? "Total to pay" : "Total to receive"}
          </span>
          <span className="tabular-nums font-medium">{fmtSettle(quote.totalCost)}</span>
        </div>
      </div>

      {/* OTC value prop: savings vs sweeping the spot book */}
      <div className="mt-3 rounded-lg border border-[var(--color-up)]/30 bg-[var(--color-up)]/5 p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-up)]">
          <TrendingDown className="h-3.5 w-3.5" /> Est. saving vs spot
        </div>
        <div className="mt-1 flex items-end justify-between">
          <div className="text-xl font-semibold tabular-nums text-[var(--color-up)]">
            {fmtSettle(quote.savings)}
          </div>
          <div className="text-[11px] text-[var(--color-muted)] text-right">
            spot slippage ~{quote.estSpotSlippagePct.toFixed(2)}% vs desk {quote.spreadPct.toFixed(2)}%
            <br />
            spot est. {fmtSettle(quote.estSpotCost)}
          </div>
        </div>
      </div>

      {/* Countdown */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-[var(--color-muted)] mb-1">
          <span>Quote valid for</span>
          <span className="tabular-nums">{secondsLeft}s</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-2)] overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-200",
              secondsLeft <= 5 ? "bg-[var(--color-down)]" : "bg-[var(--color-accent)]",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {error ? <div className="mt-2 text-sm text-[var(--color-down)]">{error}</div> : null}

      <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2">
        <button
          type="button"
          onClick={onDecline}
          disabled={accepting}
          className="py-3 rounded-xl border border-[var(--color-border)] text-sm hover:bg-[var(--color-surface)] disabled:opacity-50"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={accepting}
          className={cn(
            "py-3 rounded-xl font-medium flex items-center justify-center gap-2",
            side === "BUY"
              ? "bg-[var(--color-up)] text-black hover:opacity-90"
              : "bg-[var(--color-down)] text-white hover:opacity-90",
          )}
        >
          {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {accepting ? "Settling…" : "Accept & Settle"}
        </button>
      </div>
    </div>
  );
}
