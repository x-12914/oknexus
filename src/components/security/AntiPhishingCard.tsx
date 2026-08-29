"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";

/**
 * Anti-phishing code.
 *
 * A short phrase the user picks, included in every email we send. Mail without
 * it didn't come from us — which is the only reliable way to tell a genuine
 * notification from a convincing forgery, since anyone can copy our branding.
 */
export function AntiPhishingCard() {
  const [code, setCode] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/user/anti-phishing", { cache: "no-store" });
    const j = (await r.json()) as { code: string | null };
    setCode(j.code);
    setDraft(j.code ?? "");
    setLoaded(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh().catch(() => setLoaded(true));
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const r = await fetch("/api/user/anti-phishing", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: draft }),
      });
      const j = (await r.json()) as { code?: string; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Couldn't save that.");
      setCode(j.code ?? draft);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
      <div className="flex items-center gap-2">
        <MailCheck className="h-4 w-4 text-[var(--color-accent)]" />
        <h3 className="font-medium text-[var(--color-foreground)]">Anti-phishing code</h3>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
        Pick a short phrase. We&apos;ll put it in every email we send you, so you can tell our
        messages from a fake one. If an email claims to be from OKNexus and doesn&apos;t show your
        code, it isn&apos;t from us.
      </p>

      {!loaded ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setSaved(false);
            }}
            maxLength={24}
            placeholder="e.g. blue-harbour"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none"
          />
          <button
            type="button"
            disabled={busy || draft.trim().length < 4 || draft === code}
            onClick={save}
            className="shrink-0 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {saved && <p className="mt-2 text-xs text-[var(--color-up)]">Saved.</p>}
      {error && <p className="mt-2 text-xs text-[var(--color-down)]">{error}</p>}
    </div>
  );
}
