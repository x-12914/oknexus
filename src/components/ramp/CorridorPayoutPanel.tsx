"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { CorridorPicker } from "@/components/ramp/CorridorPicker";
import type { PayoutQuote } from "@/lib/ramp/types";

interface Selection {
  country: string;
  currency: string;
  destination: string;
  values: Record<string, string>;
  min: number;
  max: number;
}

/**
 * Payouts to corridors other than Nigeria.
 *
 * Deliberately a separate panel rather than a rewrite of the naira one. That
 * one has settled real money; bolting eight untested corridors onto it would
 * put a proven route and an unproven one behind the same code on the same day.
 *
 * Nigeria is filtered out here for the same reason from the other direction —
 * it already has a panel that resolves the account holder's name server-side,
 * which is a safety net these corridors do not have an equivalent for.
 */
export function CorridorPayoutPanel() {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [fiatAmount, setFiatAmount] = useState("");
  const [quote, setQuote] = useState<PayoutQuote | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [controls, setControls] = useState<{ twoFAReady: boolean; kycApproved: boolean } | null>(
    null,
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      api
        .payoutControls()
        .then((c) => setControls({ twoFAReady: c.twoFAReady, kycApproved: c.kycApproved }))
        .catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Stable identity: CorridorPicker keeps this in a ref, but passing a fresh
  // arrow every render would still churn its effect for no reason.
  const onPicked = useCallback((v: Selection | null) => {
    setSelection(v);
    setQuote(null);
  }, []);

  const amount = Number.parseFloat(fiatAmount);
  const amountValid =
    Number.isFinite(amount) &&
    amount > 0 &&
    (!selection?.min || amount >= selection.min) &&
    (!selection?.max || amount <= selection.max);

  const getQuote = async () => {
    if (!selection) return;
    setBusy(true);
    setError(null);
    try {
      setQuote(
        await api.payoutQuote({
          fromSymbol: "USDT",
          fiatAmount: amount,
          country: selection.country,
          fiatCode: selection.currency,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!selection || !quote) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.payoutExecute({
        payoutId: quote.payoutId,
        corridor: {
          country: selection.country,
          destinationType: selection.destination,
          fields: selection.values,
        },
        code,
      });
      setDone(`${r.fiatAmount.toLocaleString()} ${r.fiatCode} is on its way.`);
      setQuote(null);
      setFiatAmount("");
      setCode("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
      <div className="flex items-center gap-2">
        <Globe2 className="h-4 w-4 text-[var(--color-accent)]" />
        <h2 className="font-medium text-[var(--color-foreground)]">Withdraw to another country</h2>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
        Mobile money, bank transfer and SWIFT across nine currencies. Funded from your USDT
        balance.
      </p>

      {/* Stated up front rather than discovered at the last step, where it is
          most annoying to be told. */}
      {controls && (!controls.twoFAReady || !controls.kycApproved) && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-xs leading-relaxed text-[var(--color-muted)]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
          <span>
            Before sending money abroad you need
            {!controls.twoFAReady && " two-factor authentication"}
            {!controls.twoFAReady && !controls.kycApproved && " and"}
            {!controls.kycApproved && " a verified identity"}. Both are under Settings.
          </span>
        </p>
      )}

      <div className="mt-5">
        <CorridorPicker onChange={onPicked} />
      </div>

      {selection && (
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="text-xs text-[var(--color-muted)]">
              Amount in {selection.currency}
            </span>
            <input
              value={fiatAmount}
              onChange={(e) => {
                setFiatAmount(e.target.value);
                setQuote(null);
              }}
              inputMode="decimal"
              placeholder={selection.min ? String(selection.min) : "0"}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none"
            />
          </label>

          {!quote ? (
            <button
              type="button"
              disabled={busy || !amountValid}
              onClick={getQuote}
              className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
            >
              {busy ? "Pricing…" : "Get a quote"}
            </button>
          ) : (
            <div className="space-y-3 rounded-lg border border-[var(--color-border)] p-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-muted)]">You send</span>
                <span className="font-medium text-[var(--color-foreground)]">
                  {quote.fromAmount} {quote.fromSymbol}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-muted)]">They receive</span>
                <span className="font-semibold text-[var(--color-foreground)]">
                  {quote.fiatAmount.toLocaleString()} {quote.fiatCode}
                </span>
              </div>
              <label className="block">
                <span className="text-xs text-[var(--color-muted)]">Authenticator code</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none"
                />
              </label>
              <button
                type="button"
                disabled={busy || code.length !== 6}
                onClick={send}
                className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
              >
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-[var(--color-down)]">{error}</p>}
      {done && <p className="mt-3 text-sm text-[var(--color-up)]">{done}</p>}
    </div>
  );
}
