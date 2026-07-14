"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, Loader2, CheckCircle2, Clock } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type {
  FiatCurrency,
  RampPaymentMethod,
  RampQuote,
  RampSide,
  SwapAsset,
} from "@/lib/exchange/types";
import { AssetSelect } from "@/components/swap/AssetSelect";
import { PillDropdown, FiatBadge, type PillOption } from "./PillDropdown";

const BUY_CHIPS = [50, 100, 250, 500];

function smartQty(v: number): string {
  const decimals = v >= 1000 ? 2 : v >= 1 ? 4 : 6;
  return v.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

export function RampCard() {
  const [currencies, setCurrencies] = useState<FiatCurrency[]>([]);
  const [methods, setMethods] = useState<RampPaymentMethod[]>([]);
  const [assets, setAssets] = useState<SwapAsset[]>([]);

  const [side, setSide] = useState<RampSide>("BUY");
  const [fiatCode, setFiatCode] = useState("USD");
  const [cryptoSymbol, setCryptoSymbol] = useState("BTC");
  const [methodId, setMethodId] = useState("card");
  const [amount, setAmount] = useState("");

  const [quote, setQuote] = useState<RampQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [executing, setExecuting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  // Real wallet balances (null = unknown/signed out — don't block the SELL guard on it).
  const [balances, setBalances] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    api.rampConfig().then((r) => {
      setCurrencies(r.currencies);
      setMethods(r.methods);
    }).catch(() => {});
    api.swapAssets().then((r) => setAssets(r.assets)).catch(() => {});
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

  const fiat = currencies.find((c) => c.code === fiatCode);
  const availableMethods = methods.filter((m) => m.sides.includes(side));
  const method = methods.find((m) => m.id === methodId);
  const amountNum = Number(amount);
  const cryptoBalance = balances?.[cryptoSymbol] ?? 0;
  const sellExceedsBalance =
    side === "SELL" && balances != null && amountNum > cryptoBalance;

  const fmtFiat = useCallback(
    (v: number) =>
      `${fiat?.symbol ?? ""}${v.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    [fiat],
  );

  const fetchQuote = useCallback(
    async (silent = false) => {
      if (!(amountNum > 0)) {
        setQuote(null);
        return;
      }
      if (!silent) setLoadingQuote(true);
      setError(null);
      try {
        const q = await api.rampQuote({
          side,
          fiatCode,
          cryptoSymbol,
          paymentMethodId: methodId,
          amount: amountNum,
        });
        setQuote(q);
        setSecondsLeft(Math.max(0, Math.ceil((q.expiresAt - Date.now()) / 1000)));
      } catch (e) {
        setError((e as Error).message);
        setQuote(null);
      } finally {
        setLoadingQuote(false);
      }
    },
    [amountNum, side, fiatCode, cryptoSymbol, methodId],
  );

  useEffect(() => {
    const t = setTimeout(() => fetchQuote(false), 400);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  const fetchRef = useRef(fetchQuote);
  useEffect(() => {
    fetchRef.current = fetchQuote;
  });

  useEffect(() => {
    if (!quote) return;
    const id = setInterval(() => {
      const left = Math.ceil((quote.expiresAt - Date.now()) / 1000);
      if (left <= 0) fetchRef.current(true);
      else setSecondsLeft(left);
    }, 250);
    return () => clearInterval(id);
  }, [quote]);

  const switchSide = (next: RampSide) => {
    setSuccess(null);
    setSide(next);
    setAmount("");
    setQuote(null);
    // Wire is buy-only; fall back to card if it's no longer valid.
    const stillValid = methods.find((m) => m.id === methodId)?.sides.includes(next);
    if (!stillValid) setMethodId("card");
  };

  const changeAmount = (v: string) => {
    setSuccess(null);
    setAmount(v.replace(/[^0-9.]/g, ""));
  };

  const execute = async () => {
    if (!quote) return;
    setExecuting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.rampExecute(quote.quoteId);
      const verb = res.side === "BUY" ? "Bought" : "Sold";
      const detail = `${smartQty(res.cryptoAmount)} ${res.cryptoSymbol} for ${fmtFiat(res.totalFiat)}`;
      setSuccess(
        res.status === "PENDING"
          ? `Order received — ${verb.toLowerCase()} ${detail}. Settling via bank transfer.`
          : `${verb} ${detail}`,
      );
      setAmount("");
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

  const fiatOptions: PillOption[] = currencies.map((c) => ({
    key: c.code,
    label: c.code,
    sub: c.name,
    leading: <FiatBadge symbol={c.symbol} />,
  }));

  const methodOptions: PillOption[] = availableMethods.map((m) => ({
    key: m.id,
    label: m.name,
    sub: `${(m.feePct * 100).toFixed(1)}% fee · ${m.etaLabel}`,
  }));

  const canSubmit = quote && !executing && amountNum > 0 && !sellExceedsBalance;
  const actionLabel = side === "BUY" ? `Buy ${cryptoSymbol}` : `Sell ${cryptoSymbol}`;

  // The two stacked boxes swap roles by side.
  const payBox =
    side === "BUY" ? (
      <FiatInputBox
        label="You pay"
        amount={amount}
        onAmount={changeAmount}
        fiat={fiat}
        fiatOptions={fiatOptions}
        onFiat={(c) => {
          setSuccess(null);
          setFiatCode(c);
        }}
      />
    ) : (
      <CryptoInputBox
        label="You sell"
        amount={amount}
        onAmount={changeAmount}
        assets={assets}
        cryptoSymbol={cryptoSymbol}
        onCrypto={(s) => {
          setSuccess(null);
          setCryptoSymbol(s);
        }}
        balance={cryptoBalance}
        onMax={() => {
          setSuccess(null);
          setAmount(String(cryptoBalance));
        }}
        invalid={sellExceedsBalance}
      />
    );

  const receiveBox =
    side === "BUY" ? (
      <CryptoOutputBox
        label="You receive"
        value={quote ? smartQty(quote.cryptoAmount) : loadingQuote ? "…" : "0.0"}
        assets={assets}
        cryptoSymbol={cryptoSymbol}
        onCrypto={(s) => {
          setSuccess(null);
          setCryptoSymbol(s);
        }}
      />
    ) : (
      <FiatOutputBox
        label="You receive"
        value={quote ? fmtFiat(quote.totalFiat) : loadingQuote ? "…" : fmtFiat(0)}
        fiat={fiat}
        fiatOptions={fiatOptions}
        onFiat={(c) => {
          setSuccess(null);
          setFiatCode(c);
        }}
      />
    );

  return (
    <div className="w-full max-w-md rounded-2xl glass p-4">
      <h1 className="text-lg font-semibold mb-3">Buy &amp; Sell Crypto</h1>

      {/* Buy / Sell toggle */}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--color-surface-2)] p-1 mb-3">
        {(["BUY", "SELL"] as RampSide[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => switchSide(s)}
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

      {payBox}

      {side === "BUY" ? (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {BUY_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => changeAmount(String(c))}
              className="px-2.5 py-1 rounded-md border border-[var(--color-border)] text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:border-[var(--color-muted)]"
            >
              {fiat?.symbol}
              {c}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex justify-center my-2">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
          <ArrowDown className="h-4 w-4 text-[var(--color-muted)]" />
        </div>
      </div>

      {receiveBox}

      {/* Payment method */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-[var(--color-muted)]">
          {side === "BUY" ? "Pay with" : "Receive via"}
        </span>
        <PillDropdown
          value={methodId}
          options={methodOptions}
          onChange={(id) => {
            setSuccess(null);
            setMethodId(id);
          }}
          widthClass="w-64"
          trigger={
            <span className="text-sm font-medium">
              {method?.name ?? "Select"}
            </span>
          }
        />
      </div>

      {/* Quote breakdown */}
      {quote ? (
        <div className="mt-3 space-y-1.5 text-xs">
          <Row label="Rate">
            <span className="tabular-nums">
              1 {quote.cryptoSymbol} = {fmtFiat(quote.rate)}
            </span>
          </Row>
          <Row label={`Processing fee (${((method?.feePct ?? 0) * 100).toFixed(1)}%)`}>
            <span className="tabular-nums">{fmtFiat(quote.processingFee)}</span>
          </Row>
          <Row label="Network fee">
            <span className="tabular-nums">{fmtFiat(quote.networkFee)}</span>
          </Row>
          <Row label={side === "BUY" ? "Total charged" : "Total received"}>
            <span className="tabular-nums font-medium text-[var(--color-foreground)]">
              {fmtFiat(quote.totalFiat)}
            </span>
          </Row>
          <Row label="Estimated arrival">
            <span className="inline-flex items-center gap-1 text-[var(--color-muted)]">
              <Clock className="h-3 w-3" /> {quote.etaLabel}
            </span>
          </Row>
          <Row label="Quote refresh">
            <span className="tabular-nums text-[var(--color-muted)]">{secondsLeft}s</span>
          </Row>
        </div>
      ) : null}

      {error ? <div className="mt-3 text-sm text-[var(--color-down)]">{error}</div> : null}
      {success ? (
        <div className="mt-3 flex items-start gap-2 text-sm text-[var(--color-up)]">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> <span>{success}</span>
        </div>
      ) : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={execute}
        className={cn(
          "mt-4 w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2",
          canSubmit
            ? side === "BUY"
              ? "bg-[var(--color-up)] text-black hover:opacity-90"
              : "bg-[var(--color-down)] text-white hover:opacity-90"
            : "bg-[var(--color-surface-2)] text-[var(--color-muted)] cursor-not-allowed",
        )}
      >
        {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {sellExceedsBalance
          ? `Insufficient ${cryptoSymbol}`
          : !amountNum
            ? "Enter an amount"
            : !quote
              ? "Fetching quote…"
              : executing
                ? "Processing…"
                : actionLabel}
      </button>

      <p className="mt-3 text-center text-[10px] text-[var(--color-muted)]">
        Crypto settles to your Nexus wallet · fiat rail is simulated (demo)
      </p>
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

function FiatInputBox({
  label,
  amount,
  onAmount,
  fiat,
  fiatOptions,
  onFiat,
}: {
  label: string;
  amount: string;
  onAmount: (v: string) => void;
  fiat?: FiatCurrency;
  fiatOptions: PillOption[];
  onFiat: (code: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
      <div className="text-xs text-[var(--color-muted)] mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span className="text-2xl font-medium text-[var(--color-muted)]">{fiat?.symbol}</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => onAmount(e.target.value)}
            placeholder="0.00"
            className="w-full min-w-0 bg-transparent text-2xl font-medium tabular-nums outline-none"
          />
        </div>
        <PillDropdown
          value={fiat?.code ?? ""}
          options={fiatOptions}
          onChange={onFiat}
          trigger={
            <span className="inline-flex items-center gap-1.5">
              <FiatBadge symbol={fiat?.symbol ?? "$"} />
              <span className="text-sm font-medium">{fiat?.code}</span>
            </span>
          }
        />
      </div>
    </div>
  );
}

function FiatOutputBox({
  label,
  value,
  fiat,
  fiatOptions,
  onFiat,
}: {
  label: string;
  value: string;
  fiat?: FiatCurrency;
  fiatOptions: PillOption[];
  onFiat: (code: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
      <div className="text-xs text-[var(--color-muted)] mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 text-2xl font-medium tabular-nums">{value}</div>
        <PillDropdown
          value={fiat?.code ?? ""}
          options={fiatOptions}
          onChange={onFiat}
          trigger={
            <span className="inline-flex items-center gap-1.5">
              <FiatBadge symbol={fiat?.symbol ?? "$"} />
              <span className="text-sm font-medium">{fiat?.code}</span>
            </span>
          }
        />
      </div>
    </div>
  );
}

function CryptoInputBox({
  label,
  amount,
  onAmount,
  assets,
  cryptoSymbol,
  onCrypto,
  balance,
  onMax,
  invalid,
}: {
  label: string;
  amount: string;
  onAmount: (v: string) => void;
  assets: SwapAsset[];
  cryptoSymbol: string;
  onCrypto: (s: string) => void;
  balance: number;
  onMax: () => void;
  invalid: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
      <div className="flex items-center justify-between text-xs text-[var(--color-muted)] mb-1">
        <span>{label}</span>
        <button type="button" onClick={onMax} className="hover:text-[var(--color-foreground)]">
          Balance: {smartQty(balance)} {cryptoSymbol}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmount(e.target.value)}
          placeholder="0.0"
          className={cn(
            "flex-1 min-w-0 bg-transparent text-2xl font-medium tabular-nums outline-none",
            invalid ? "text-[var(--color-down)]" : "text-[var(--color-foreground)]",
          )}
        />
        <AssetSelect assets={assets} value={cryptoSymbol} onChange={onCrypto} />
      </div>
    </div>
  );
}

function CryptoOutputBox({
  label,
  value,
  assets,
  cryptoSymbol,
  onCrypto,
}: {
  label: string;
  value: string;
  assets: SwapAsset[];
  cryptoSymbol: string;
  onCrypto: (s: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
      <div className="text-xs text-[var(--color-muted)] mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 text-2xl font-medium tabular-nums">{value}</div>
        <AssetSelect assets={assets} value={cryptoSymbol} onChange={onCrypto} />
      </div>
    </div>
  );
}
