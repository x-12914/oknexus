"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Link2, Loader2 } from "lucide-react";

export interface ConnectedAccountItem {
  /** Auth.js provider id, e.g. "google". */
  id: string;
  label: string;
}

export function ConnectedAccountsCard({
  connected,
  available,
  hasPassword,
}: {
  connected: ConnectedAccountItem[];
  available: ConnectedAccountItem[];
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Disconnecting the last provider would lock out an account with no password.
  const isOnlyWayIn = !hasPassword && connected.length <= 1;

  const disconnect = async (provider: string) => {
    setError(null);
    setBusy(provider);
    try {
      const res = await fetch("/api/auth/social/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Could not disconnect that account. Please try again.");
        setBusy(null);
        return;
      }
      router.refresh();
      setBusy(null);
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(null);
    }
  };

  if (connected.length === 0 && available.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
      <h3 className="flex items-center gap-2 font-medium text-[var(--color-foreground)]">
        <Link2 className="h-4 w-4 text-[var(--color-muted)]" /> Social sign-in
      </h3>
      <p className="mt-1 max-w-sm text-xs text-[var(--color-muted)]">
        Sign in with a linked account instead of your password. Two-factor authentication still
        applies when it&apos;s switched on.
      </p>

      {error ? <div className="mt-3 text-sm text-[var(--color-down)]">{error}</div> : null}

      {connected.length > 0 ? (
        <ul className="mt-4 divide-y divide-[var(--color-border)]">
          {connected.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{a.label}</div>
                <div className="text-xs text-[var(--color-muted)]">Connected</div>
              </div>
              <button
                type="button"
                onClick={() => disconnect(a.id)}
                disabled={busy !== null || isOnlyWayIn}
                title={
                  isOnlyWayIn
                    ? "This is your only way to sign in. Set a password first."
                    : undefined
                }
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] disabled:opacity-50"
              >
                {busy === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-[var(--color-muted)]">No accounts connected yet.</p>
      )}

      {available.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {available.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setBusy(p.id);
                void signIn(p.id, { redirectTo: "/settings/security" });
              }}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-surface)] disabled:opacity-60"
            >
              {`Connect ${p.label}`}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
