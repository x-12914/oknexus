"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2, ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { cn } from "@/lib/utils";
import { AssetCoin } from "@/components/swap/AssetSelect";

const STATUS: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: "Queued", cls: "text-amber-500" },
  BROADCAST: { label: "Sending", cls: "text-[var(--color-accent)]" },
  CONFIRMED: { label: "Sent", cls: "text-[var(--color-up)]" },
  FAILED: { label: "Failed", cls: "text-[var(--color-down)]" },
};

function fmtQty(v: number): string {
  const d = v >= 1000 ? 2 : v >= 1 ? 4 : 8;
  return v.toLocaleString(undefined, { maximumFractionDigits: d });
}

export function WithdrawPanel() {
  const { data: config } = usePolling(() => api.custodyConfig(), 60000, []);
  const { data: wallet } = usePolling(() => api.wallet(), 8000, []);
  const { data: history, refresh } = usePolling(() => api.custodyHistory(), 8000, []);

  const chains = config?.chains ?? [];
  const [chain, setChain] = useState("");
  if (chains.length > 0 && !chain) setChain(chains[0].chain);
  const chainInfo = chains.find((c) => c.chain === chain);
  const assets = chainInfo?.assets ?? [];
  const labelOf = (ch: string) => chains.find((c) => c.chain === ch)?.label ?? ch;

  const [symbol, setSymbol] = useState("");
  // Keep the selected asset valid for the chosen network.
  if (assets.length > 0 && !assets.includes(symbol)) setSymbol(assets[0]);

  const [amount, setAmount] = useState("");
  const [to, setTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const balance = wallet?.items.find((i) => i.symbol === symbol)?.balance ?? 0;
  const amountNum = Number(amount);
  const fee = config?.withdrawFees?.[symbol] ?? 0;
  const total = amountNum + fee;
  const notConfigured = config && !config.configured;
  const insufficient = total > balance;
  const withdrawals = history?.withdrawals ?? [];
  const canSubmit = amountNum > 0 && !!to && !insufficient && !submitting && !notConfigured && !!chain;

  const submit = async () => {
    setError(null);
    setOk(null);
    if (!(amountNum > 0)) return setError("Enter an amount");
    if (!to) return setError("Enter a destination address");
    setSubmitting(true);
    try {
      await api.custodyWithdraw(chain, symbol, amountNum, to.trim());
      setOk("Withdrawal requested — broadcasting on-chain.");
      setAmount("");
      setTo("");
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
      <h1 className="text-xl font-semibold mb-3">Withdraw crypto</h1>

      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-500 mb-4 flex gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Testnet only — withdrawals settle on {chainInfo?.label ?? "the selected network"}, sent from
        the exchange hot wallet.
      </div>

      {notConfigured ? (
        <div className="rounded-xl border border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-muted)]">
          On-chain withdrawals are being switched on. Check back shortly.
        </div>
      ) : (
        <div className="rounded-2xl glass p-4 space-y-3">
          {/* Network */}
          <div>
            <div className="text-xs text-[var(--color-muted)] mb-1.5">Network</div>
            <div className="flex flex-wrap gap-2">
              {chains.map((c) => (
                <button
                  key={c.chain}
                  type="button"
                  onClick={() => setChain(c.chain)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm",
                    c.chain === chain
                      ? "border-[var(--color-accent)] text-[var(--color-foreground)]"
                      : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Asset */}
          <div>
            <div className="text-xs text-[var(--color-muted)] mb-1.5">Asset</div>
            <div className="flex flex-wrap gap-2">
              {assets.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setSymbol(a)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
                    a === symbol
                      ? "border-[var(--color-accent)] text-[var(--color-foreground)]"
                      : "border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                  )}
                >
                  <AssetCoin symbol={a} size={18} /> {a}
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
                onClick={() => setAmount(String(Math.max(0, balance - fee)))}
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

          {/* Destination */}
          <div>
            <div className="text-xs text-[var(--color-muted)] mb-1">Destination address</div>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={chainInfo?.chain.includes("solana") ? "Solana address…" : "0x… / address"}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          {amountNum > 0 ? (
            <div className="space-y-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-muted)]">Amount</span>
                <span className="tabular-nums">
                  {fmtQty(amountNum)} {symbol}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-muted)]">Network fee</span>
                <span className="tabular-nums">
                  {fee > 0 ? `${fmtQty(fee)} ${symbol}` : "Free"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-1.5 font-medium">
                <span>Total debited</span>
                <span className={cn("tabular-nums", insufficient && "text-[var(--color-down)]")}>
                  {fmtQty(total)} {symbol}
                </span>
              </div>
            </div>
          ) : null}

          {error ? <div className="text-sm text-[var(--color-down)]">{error}</div> : null}
          {ok ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-up)]">
              <CheckCircle2 className="h-4 w-4" /> {ok}
            </div>
          ) : null}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className={cn(
              "w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2",
              canSubmit
                ? "btn-brand"
                : "bg-[var(--color-surface-2)] text-[var(--color-muted)] cursor-not-allowed",
            )}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {insufficient
              ? `Insufficient ${symbol}`
              : submitting
                ? "Requesting…"
                : `Withdraw ${symbol}`}
          </button>
        </div>
      )}

      <h2 className="text-sm font-semibold mt-6 mb-2">Recent withdrawals</h2>
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        {!history ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[var(--color-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--color-muted)]">
            No withdrawals yet.
          </div>
        ) : (
          withdrawals.map((w) => {
            const s = STATUS[w.status] ?? { label: w.status, cls: "text-[var(--color-muted)]" };
            return (
              <div
                key={w.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--color-border)] last:border-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AssetCoin symbol={w.symbol} size={26} />
                  <div className="min-w-0">
                    <div className="text-sm">
                      −{fmtQty(w.amount)} {w.symbol}
                    </div>
                    <div className="text-xs text-[var(--color-muted)] truncate max-w-[240px]">
                      {labelOf(w.chain)} · to {w.toAddress}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn("text-xs font-medium", s.cls)}>{s.label}</div>
                  {w.explorerUrl ? (
                    <a
                      href={w.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
                    >
                      tx <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
