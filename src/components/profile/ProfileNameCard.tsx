"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";

/**
 * The display name is the only thing on this page a user can change.
 *
 * Email is tied to login and verification, and role and KYC status are decided
 * elsewhere — so they're shown as facts, not fields.
 */
export function ProfileNameCard({ initialName }: { initialName: string | null }) {
  const [name, setName] = useState(initialName ?? "");
  const [draft, setDraft] = useState(initialName ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: draft }),
      });
      const j = (await r.json()) as { name?: string; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Couldn't save that.");
      setName(j.name ?? draft);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="text-xs text-[var(--color-muted)]">Display name</div>
      {editing ? (
        <div className="mt-1 flex items-center gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={60}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-sm text-[var(--color-foreground)] outline-none"
          />
          <button
            type="button"
            onClick={save}
            disabled={busy || draft.trim().length === 0}
            className="text-[var(--color-up)] disabled:opacity-40"
            aria-label="Save name"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(name);
              setEditing(false);
              setError(null);
            }}
            className="text-[var(--color-muted)]"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-foreground)]">
            {name || "Not set"}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[var(--color-muted)] transition hover:text-[var(--color-foreground)]"
            aria-label="Edit name"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-[var(--color-down)]">{error}</p>}
    </div>
  );
}
