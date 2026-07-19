"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2, CheckCircle2, Send } from "lucide-react";
import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { cn } from "@/lib/utils";
import { AssetCoin } from "@/components/swap/AssetSelect";

function fmtQty(v: number): string {
  const d = v >= 1000 ? 2 : v >= 1 ? 4 : 8;
  return v.toLocaleString(undefined, { maximumFractionDigits: d });
}

export function SendPanel() {
  const { data: wallet, refresh } = usePolling(() => api.wallet(), 8000, []);
  const items = wallet?.items ?? [];

  const [symbol, setSymbol] = useState("");
  if (items.length > 0 && !symbol) setSymbol(items[0].symbol);

  const [toEmail, setToEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const balance = items.find((i) => i.symbol === symbol)?.balance ?? 0;
  const amountNum = Number(amount);
  const insufficient = amountNum > balance;
  const canSend = !!toEmail && amountNum > 0 && !insufficient && !submitting;

  const submit = async () => {
    setError(null);
    setOk(null);
    if (!toEmail) return setError("Enter the recipient's email.");
    if (!(amountNum > 0)) return setError("Enter an amount.");
    setSubmitting(true);
    try {
      const res = await api.walletTransfer({
        toEmail: toEmail.trim(),
        symbol,
        amount: amountNum,
        note: note.trim() || undefined,
      });
      setOk(`Sent ${fmtQty(res.amount)} ${res.symbol} to ${res.toName ?? res.toEmail}.`);
      setAmount("");
      setNote("");
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <Link
        href="/wallet"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to wallet
      </Link>
      <h1 className="text-xl font-semibold mb-1">Send crypto</h1>
      <p className="text-sm text-[var(--color-muted)] mb-4">
        Instantly transfer to another OKNexus account — free, with no network fees.
      </p>

      <div className="rounded-2xl glass p-4 space-y-3">
        {/* Recipient */}
        <div>
          <div className="text-xs text-[var(--color-muted)] mb-1">Recipient email</div>
          <input
            type="email"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            placeholder="name@email.com"
            autoComplete="off"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Asset */}
        <div>
          <div className="text-xs text-[var(--color-muted)] mb-1.5">Asset</div>
          <div className="flex flex-wrap gap-2">
            {items.map((it) => (
              <button
                key={it.symbol}
                type="button"
                onClick={() => setSymbol(it.symbol)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
                  it.symbol === symbol
                    ? "border-[var(--color-accent)] text-[var(--color-foreground)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                )}
              >
                <AssetCoin symbol={it.symbol} size={18} /> {it.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between text-xs text-[var(--color-muted)] mb-1">
            <span>Amount</span>
            <button
              type="button"
              onClick={() => setAmount(String(balance))}
              className="hover:text-[var(--color-foreground)]"
            >
              Available: {fmtQty(balance)} {symbol}
            </button>
          </div>
          <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] focus-within:border-[var(--color-accent)]">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.0"
              className={cn(
                "flex-1 min-w-0 bg-transparent px-3 py-2.5 text-lg tabular-nums outline-none",
                insufficient ? "text-[var(--color-down)]" : "",
              )}
            />
            <span className="px-3 text-sm text-[var(--color-muted)]">{symbol}</span>
          </div>
        </div>

        {/* Note */}
        <div>
          <div className="text-xs text-[var(--color-muted)] mb-1">Note (optional)</div>
          <input
            type="text"
            value={note}
            maxLength={120}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's it for?"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {error ? <div className="text-sm text-[var(--color-down)]">{error}</div> : null}
        {ok ? (
          <div className="flex items-center gap-2 text-sm text-[var(--color-up)]">
            <CheckCircle2 className="h-4 w-4" /> {ok}
          </div>
        ) : null}

        <button
          type="button"
          disabled={!canSend}
          onClick={submit}
          className={cn(
            "w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2",
            canSend
              ? "btn-brand"
              : "bg-[var(--color-surface-2)] text-[var(--color-muted)] cursor-not-allowed",
          )}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {insufficient
            ? `Insufficient ${symbol}`
            : submitting
              ? "Sending…"
              : `Send ${symbol}`}
        </button>
      </div>

      <p className="mt-3 text-center text-xs leading-relaxed text-[var(--color-muted)]">
        Transfers settle instantly inside OKNexus. Double-check the email — sent funds move
        immediately and can&apos;t be reversed.
      </p>
    </div>
  );
}
