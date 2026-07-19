"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Copy, Check, ExternalLink, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { cn } from "@/lib/utils";
import { AssetCoin } from "@/components/swap/AssetSelect";
import { QrCode } from "@/components/custody/QrCode";
import type { DepositAddressInfo } from "@/lib/custody-types";

export function DepositPanel() {
  const { data: config } = usePolling(() => api.custodyConfig(), 60000, []);
  const { data: history } = usePolling(() => api.custodyHistory(), 8000, []);
  const chains = config?.chains ?? [];
  const [chain, setChain] = useState("");
  if (chains.length > 0 && !chain) setChain(chains[0].chain);
  const chainInfo = chains.find((c) => c.chain === chain);
  const labelOf = (ch: string) => chains.find((c) => c.chain === ch)?.label ?? ch;

  const [addr, setAddr] = useState<DepositAddressInfo | null>(null);
  const [addrErr, setAddrErr] = useState<{ chain: string; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!chain) return;
    let cancelled = false;
    api
      .custodyAddress(chain)
      .then((a) => {
        if (!cancelled) {
          setAddrErr(null);
          setAddr(a);
        }
      })
      .catch((e) => {
        if (!cancelled) setAddrErr({ chain, msg: (e as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [chain]);

  // Only treat the loaded address/error as current if it matches the selected chain.
  const shown = addr && addr.chain === chain ? addr : null;
  const err = addrErr && addrErr.chain === chain ? addrErr.msg : null;

  const copy = async () => {
    if (!addr) return;
    await navigator.clipboard.writeText(addr.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const notConfigured = config && !config.configured;
  const deposits = history?.deposits ?? [];

  return (
    <div className="p-6 max-w-lg mx-auto">
      <Link
        href="/wallet"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to wallet
      </Link>
      <h1 className="text-xl font-semibold mb-3">Deposit crypto</h1>

      {/* Network picker */}
      <div className="mb-3">
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

      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-500 mb-4 flex gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Testnet only — send test coins on {chainInfo?.label ?? "the selected network"}. Never send
        real mainnet assets to this address.
      </div>

      {notConfigured ? (
        <div className="rounded-xl border border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-muted)]">
          On-chain deposits are being switched on. Check back shortly.
        </div>
      ) : err ? (
        <div className="rounded-xl border border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-down)]">
          {err}
        </div>
      ) : !shown ? (
        <div className="flex items-center justify-center gap-2 py-10 text-[var(--color-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Generating your address…
        </div>
      ) : (
        <div className="rounded-2xl glass p-4">
          <div className="text-xs text-[var(--color-muted)] mb-1">
            Your {chainInfo?.label} deposit address · {chainInfo?.minConfirmations} confirmations to
            credit
          </div>
          <div className="my-3 flex justify-center">
            <QrCode value={shown.address} size={168} />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
            <code className="flex-1 min-w-0 break-all text-sm">{shown.address}</code>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 p-1.5 rounded hover:bg-[var(--color-surface)]"
              aria-label="Copy address"
            >
              {copied ? (
                <Check className="h-4 w-4 text-[var(--color-up)]" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
          <a
            href={shown.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
          >
            View on explorer <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      <h2 className="text-sm font-semibold mt-6 mb-2">Recent deposits</h2>
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
        {!history ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[var(--color-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : deposits.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--color-muted)]">No deposits yet.</div>
        ) : (
          deposits.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--color-border)] last:border-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AssetCoin symbol={d.symbol} size={26} />
                <div className="min-w-0">
                  <div className="text-sm">
                    +{d.amount} {d.symbol}
                  </div>
                  <div className="text-xs text-[var(--color-muted)]">
                    {labelOf(d.chain)} · {new Date(d.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={
                    d.status === "CREDITED"
                      ? "text-xs font-medium text-[var(--color-up)]"
                      : "text-xs font-medium text-amber-500"
                  }
                >
                  {d.status === "CREDITED" ? "Credited" : `Confirming (${d.confirmations})`}
                </div>
                {d.explorerUrl ? (
                  <a
                    href={d.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
                  >
                    tx <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
