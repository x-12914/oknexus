"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WhitelistEntry } from "@/lib/custody-types";

interface State {
  enabled: boolean;
  addresses: WhitelistEntry[];
}

async function call(body: unknown) {
  const r = await fetch("/api/custody/whitelist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(((await r.json()) as { error?: string }).error ?? "Request failed");
  return r.json();
}

export function WithdrawalWhitelistCard() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chain, setChain] = useState("ethereum");
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");

  const refresh = useCallback(async () => {
    const r = await fetch("/api/custody/whitelist", { cache: "no-store" });
    setState((await r.json()) as State);
  }, []);

  useEffect(() => {
    // A timer, not requestAnimationFrame: rAF is suspended entirely while a
    // tab is hidden, so this never ran in a background tab. Timers are only
    // throttled, so they still fire.
    const timer = setTimeout(() => {
      refresh().catch(() => setError("Couldn't load your saved addresses."));
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const run = async (body: unknown, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await call(body);
      after?.();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!state) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5 text-sm text-[var(--color-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading whitelist…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium text-[var(--color-foreground)]">Withdrawal Whitelist</h3>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Restrict withdrawals to addresses you&apos;ve saved.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => run({ action: "setEnabled", value: !state.enabled })}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50",
            state.enabled
              ? "bg-[var(--color-up-bg)] text-[var(--color-up)]"
              : "border border-[var(--color-border)] text-[var(--color-muted)]",
          )}
        >
          {state.enabled ? "On" : "Off"}
        </button>
      </div>

      {/* The delay is the control that actually works, so it's stated up front
          rather than discovered when a withdrawal is refused. */}
      <p className="mt-3 flex items-start gap-2 rounded-lg bg-[var(--color-surface-2)] p-3 text-xs text-[var(--color-muted)]">
        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          A new address can&apos;t be used for 24 hours after you add it. That delay is what stops
          someone who gets into your account from adding their own address and withdrawing straight
          away.
        </span>
      </p>

      <div className="mt-4 space-y-2">
        {state.addresses.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                {a.label}
              </p>
              <p className="truncate font-mono text-xs text-[var(--color-muted)]">{a.address}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {a.usable ? (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--color-up)]">
                  <ShieldCheck className="h-3.5 w-3.5" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)]">
                  <Clock className="h-3.5 w-3.5" /> Pending
                </span>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => run({ action: "remove", id: a.id })}
                className="text-[var(--color-muted)] transition hover:text-[var(--color-down)] disabled:opacity-50"
                aria-label={`Remove ${a.label}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {state.addresses.length === 0 && (
          <p className="text-xs text-[var(--color-muted)]">No saved addresses yet.</p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-2 text-sm text-[var(--color-foreground)]"
          >
            <option value="ethereum">Ethereum</option>
          </select>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. My Ledger)"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none"
          />
        </div>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
          placeholder="0x…"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 font-mono text-sm text-[var(--color-foreground)] outline-none"
        />
        <button
          type="button"
          disabled={busy || address.length < 6}
          onClick={() =>
            run({ action: "add", chain, address, label: label || "Saved address" }, () => {
              setAddress("");
              setLabel("");
            })
          }
          className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
        >
          {busy ? "Saving…" : "Add address"}
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-[var(--color-down)]">{error}</p>}
    </div>
  );
}
