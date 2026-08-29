"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiKeyView {
  id: string;
  label: string;
  prefix: string;
  canTrade: boolean;
  canWithdraw: boolean;
  lastUsedAt: number | null;
  createdAt: number;
}

export function ApiKeysCard() {
  const [keys, setKeys] = useState<ApiKeyView[] | null>(null);
  const [available, setAvailable] = useState(false);
  const [label, setLabel] = useState("");
  const [canTrade, setCanTrade] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Shown once, never retrievable again. */
  const [fresh, setFresh] = useState<{ key: string; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/user/api-keys", { cache: "no-store" });
    const j = (await r.json()) as { keys: ApiKeyView[]; available: boolean };
    setKeys(j.keys);
    setAvailable(j.available);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh().catch(() => setKeys([]));
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const run = async (body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { key?: string; secret?: string; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Request failed");
      if (j.key && j.secret) setFresh({ key: j.key, secret: j.secret });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!keys) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5 text-sm text-[var(--color-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading API keys…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-[var(--color-accent)]" />
        <h3 className="font-medium text-[var(--color-foreground)]">API keys</h3>
      </div>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        For connecting bots or scripts to your account.
      </p>

      {!available && (
        <p className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-xs leading-relaxed text-[var(--color-muted)]">
          Programmatic access isn&apos;t available yet, so there&apos;s nothing a key would open
          today. We&apos;d rather say that than hand you a credential that quietly does nothing.
          Any keys you already hold are listed below and can still be revoked.
        </p>
      )}

      {fresh && (
        <div className="mt-4 rounded-lg border border-[var(--color-up)]/40 bg-[var(--color-up-bg)] p-3">
          {/* The only time this value exists outside a hash. */}
          <p className="text-xs font-medium text-[var(--color-up)]">
            Copy both now — they won&apos;t be shown again.
          </p>
          {/* The secret never leaves the server after this render: it is stored
              encrypted and used only to verify signatures. */}
          {([
            ["API key", fresh.key],
            ["Signing secret", fresh.secret],
          ] as const).map(([label, value]) => (
            <div key={label} className="mt-2">
              <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                {label}
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all font-mono text-xs text-[var(--color-foreground)]">
                  {value}
                </code>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(value);
                    setCopied(true);
                  }}
                  className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  aria-label={`Copy ${label}`}
                >
                  {copied ? <Check className="h-4 w-4 text-[var(--color-up)]" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setFresh(null);
              setCopied(false);
            }}
            className="mt-2 text-xs text-[var(--color-muted)] underline"
          >
            I&apos;ve saved it
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {keys.map((k) => (
          <div
            key={k.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                {k.label}
              </p>
              <p className="truncate font-mono text-xs text-[var(--color-muted)]">{k.prefix}…</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-[var(--color-muted)]">
                {k.canWithdraw ? "Withdraw" : k.canTrade ? "Trade" : "Read-only"}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => run({ action: "revoke", id: k.id })}
                className="text-[var(--color-muted)] transition hover:text-[var(--color-down)] disabled:opacity-50"
                aria-label={`Revoke ${k.label}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {keys.length === 0 && (
          <p className="text-xs text-[var(--color-muted)]">No API keys yet.</p>
        )}
      </div>

      {available && (
      <div className="mt-4 space-y-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="What's this key for?"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none"
        />
        <div className="flex flex-wrap gap-2">
          {[{ on: canTrade, set: setCanTrade, label: "Allow trading" }].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => p.set(!p.on)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                p.on
                  ? "bg-[var(--color-accent)] text-white"
                  : "border border-[var(--color-border)] text-[var(--color-muted)]",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="flex items-start gap-1.5 text-xs text-[var(--color-muted)]">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Keys cannot withdraw. Moving funds programmatically needs an IP allowlist, so a leaked
          key can read and trade but never drain your account.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run({ action: "create", label: label || "API key", canTrade }).then(() => {
              setLabel("");
              setCanTrade(false);
            })
          }
          className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
        >
          {busy ? "Working…" : "Create key"}
        </button>
      </div>
      )}

      {error && <p className="mt-3 text-xs text-[var(--color-down)]">{error}</p>}
    </div>
  );
}
