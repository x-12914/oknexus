"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, AlertCircle, Landmark, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { PayoutBank, PayoutConfig, PayoutQuote, FiatPayoutView } from "@/lib/ramp/types";

type Mode = "fiat" | "crypto";

function fmt(v: number, dp = 2): string {
  return v.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className={cn(strong && "font-semibold", "text-[var(--color-foreground)]")}>{value}</span>
    </div>
  );
}

export function NgnPayoutPanel() {
  const [config, setConfig] = useState<PayoutConfig | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const [fromSymbol, setFromSymbol] = useState("USDT");
  const [mode, setMode] = useState<Mode>("fiat");
  const [amount, setAmount] = useState("");

  const [bank, setBank] = useState<PayoutBank | null>(null);
  const [bankQuery, setBankQuery] = useState("");
  const [bankOpen, setBankOpen] = useState(false);
  const [account, setAccount] = useState("");

  const [quote, setQuote] = useState<PayoutQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [needs2FA, setNeeds2FA] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<FiatPayoutView | null>(null);

  // Never read Date.now() during render — React 19's purity rule rejects it and
  // it would desync hydration. A ticking state value drives the countdown.
  const [now, setNow] = useState(0);
  useEffect(() => {
    // Seed via rAF rather than synchronously: React 19 rejects a sync setState
    // in an effect body, and starting at 0 keeps the server and client markup
    // identical until the first frame.
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    api
      .payoutConfig()
      .then((r) => {
        if (r.configured && r.config) setConfig(r.config);
        else setUnavailable(true);
      })
      .catch(() => setUnavailable(true));
    // Whether this account needs an authenticator code to release funds.
    api
      .payoutControls()
      .then((r) => setNeeds2FA(r.needs2FA))
      .catch(() => {});
  }, []);

  const accountRe = useMemo(
    () => (config ? new RegExp(config.fields.accountPattern) : null),
    [config],
  );
  const accountValid = accountRe ? accountRe.test(account) : false;
  const amountNum = Number(amount);
  const amountValid = amount !== "" && Number.isFinite(amountNum) && amountNum > 0;

  const banks = useMemo(() => {
    if (!config) return [];
    const q = bankQuery.trim().toLowerCase();
    const list = q ? config.banks.filter((b) => b.name.toLowerCase().includes(q)) : config.banks;
    return list.slice(0, 50); // 358 banks — cap the DOM, search narrows it
  }, [config, bankQuery]);

  const reqId = useRef(0);
  const fetchQuote = useCallback(async () => {
    if (!config || !amountValid) {
      setQuote(null);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const q = await api.payoutQuote({
        fromSymbol,
        ...(mode === "fiat" ? { fiatAmount: amountNum } : { fromAmount: amountNum }),
      });
      if (id !== reqId.current) return; // a newer keystroke superseded this one
      setQuote(q);
    } catch (e) {
      if (id !== reqId.current) return;
      setQuote(null);
      setError((e as Error).message);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [config, amountValid, amountNum, fromSymbol, mode]);

  // Debounce so a typed amount doesn't create a provider record per keystroke.
  useEffect(() => {
    const t = setTimeout(fetchQuote, 450);
    return () => clearTimeout(t);
  }, [fetchQuote]);

  const submit = useCallback(async () => {
    if (!quote || !bank) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.payoutExecute({
        // Only ids travel — the server re-reads the quote for the real amount.
        payoutId: quote.payoutId,
        bankCode: bank.code,
        accountNumber: account,
        ...(needs2FA ? { code } : {}),
      });
      setDone(result);
      setQuote(null);
      setAmount("");
      setCode("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [quote, bank, account, needs2FA, code]);

  const secondsLeft = quote && now ? Math.max(0, Math.floor((quote.expiresAt - now) / 1000)) : 0;
  const expired = Boolean(quote) && now > 0 && secondsLeft === 0;

  if (unavailable) return null;

  if (!config) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading payout options…
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex items-center gap-2 text-[var(--color-up)]">
          <CheckCircle2 className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Payout submitted</h2>
        </div>
        <p className="text-sm text-[var(--color-foreground)]">
          {fmt(done.fiatAmount)} {done.fiatCode} to {done.bankName} {done.accountNumber}
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          {fmt(done.fromAmount, 6)} {done.fromSymbol} is reserved and will be released once your
          bank confirms. If it does not go through, it returns to your balance automatically.
        </p>
        <button
          type="button"
          onClick={() => setDone(null)}
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          Make another withdrawal
        </button>
      </div>
    );
  }

  const canSubmit =
    Boolean(quote) &&
    !expired &&
    accountValid &&
    bank !== null &&
    !loading &&
    !submitting &&
    (!needs2FA || code.length === 6);

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
          Withdraw to a Nigerian bank
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Sell {fromSymbol} and receive {config.fiatCode} directly in your bank account.
        </p>
      </div>

      <div className="flex gap-2">
        {config.fromSymbols.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFromSymbol(s)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
              s === fromSymbol
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--color-foreground)]">Amount</span>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "fiat" ? "crypto" : "fiat");
              setAmount("");
              setQuote(null);
            }}
            className="text-xs text-[var(--color-accent)] hover:underline"
          >
            Enter in {mode === "fiat" ? fromSymbol : config.fiatCode} instead
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5">
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            className="w-full bg-transparent text-lg text-[var(--color-foreground)] outline-none"
          />
          <span className="text-sm font-medium text-[var(--color-muted)]">
            {mode === "fiat" ? config.fiatCode : fromSymbol}
          </span>
        </div>
        {mode === "fiat" && (
          <p className="text-xs text-[var(--color-muted)]">
            Min {fmt(config.minFiat, 0)} — max {fmt(config.maxFiat, 0)} {config.fiatCode}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-[var(--color-foreground)]">Bank</span>
        <button
          type="button"
          onClick={() => setBankOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-left text-sm"
        >
          <span className={bank ? "text-[var(--color-foreground)]" : "text-[var(--color-muted)]"}>
            {bank?.name ?? "Select your bank"}
          </span>
          <Landmark className="h-4 w-4 text-[var(--color-muted)]" />
        </button>
        {bankOpen && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
              <Search className="h-4 w-4 text-[var(--color-muted)]" />
              <input
                value={bankQuery}
                onChange={(e) => setBankQuery(e.target.value)}
                placeholder={`Search ${config.banks.length} banks`}
                className="w-full bg-transparent text-sm text-[var(--color-foreground)] outline-none"
              />
            </div>
            <ul className="max-h-56 overflow-y-auto">
              {banks.map((b) => (
                <li key={b.code}>
                  <button
                    type="button"
                    onClick={() => {
                      setBank(b);
                      setBankOpen(false);
                      setBankQuery("");
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
                  >
                    {b.name}
                  </button>
                </li>
              ))}
              {!banks.length && (
                <li className="px-3 py-3 text-sm text-[var(--color-muted)]">No banks match that.</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-[var(--color-foreground)]">
          {config.fields.accountLabel}
        </span>
        <input
          inputMode="numeric"
          value={account}
          onChange={(e) => setAccount(e.target.value.replace(/\D/g, ""))}
          placeholder={config.fields.accountPlaceholder}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm text-[var(--color-foreground)] outline-none"
        />
        {account !== "" && !accountValid && (
          <p className="text-xs text-[var(--color-down)]">
            Nigerian account numbers are exactly 10 digits.
          </p>
        )}
      </div>

      {needs2FA && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-[var(--color-foreground)]">
            Authenticator code
          </span>
          <input
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm tracking-widest text-[var(--color-foreground)] outline-none"
          />
          <p className="text-xs text-[var(--color-muted)]">
            Required because two-factor authentication is on for this account.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-[var(--color-down-bg)] p-3 text-sm text-[var(--color-down)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {quote && (
        <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-sm">
          <Row label="You send" value={`${fmt(quote.fromAmount, 6)} ${quote.fromSymbol}`} strong />
          <Row label="They receive" value={`${fmt(quote.fiatAmount)} ${quote.fiatCode}`} strong />
          <Row
            label="Rate"
            value={`1 ${quote.fromSymbol} = ${fmt(quote.effectiveRate)} ${quote.fiatCode}`}
          />
          {/* Derived, not read from the response: the provider always reports
              fees: 0 and takes its margin inside the rate instead. */}
          <Row
            label={`Spread (${quote.spreadPct.toFixed(2)}%)`}
            value={`${fmt(quote.feeFiat)} ${quote.fiatCode}`}
          />
          <div className="border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-muted)]">
            {expired
              ? "Quote expired — edit the amount to refresh."
              : `Quote holds for ${secondsLeft}s`}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Sending…" : loading ? "Pricing…" : "Withdraw"}
      </button>
    </div>
  );
}
