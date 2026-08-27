"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Landmark, ShieldCheck } from "lucide-react";
import { api, type NgnAccountView } from "@/lib/api-client";

/**
 * Naira deposits.
 *
 * A bank transfer carries the sender's details, not ours, so the only reliable
 * way to know whose money arrived is to give every user their own account
 * number. Opening one requires bank-grade identity details, which is why this
 * asks for more than the rest of the product does.
 */
export function NairaDepositPanel() {
  const [account, setAccount] = useState<NgnAccountView | null>(null);
  const [available, setAvailable] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    bvn: "",
  });

  const refresh = useCallback(async () => {
    const r = await api.ngnAccount();
    setAccount(r.account);
    setAvailable(r.available);
    setLoaded(true);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      refresh().catch(() => setLoaded(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [refresh]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.ngnProvision(form);
      setAccount(r.account);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!account) return;
    await navigator.clipboard.writeText(account.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!loaded) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-[var(--color-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!available) {
    return (
      <p className="rounded-xl border border-[var(--color-border)] p-4 text-sm text-[var(--color-muted)]">
        Naira deposits aren&apos;t available right now.
      </p>
    );
  }

  if (account) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <Landmark className="h-4 w-4 text-[var(--color-accent)]" />
            Your naira account
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="font-mono text-2xl font-semibold tracking-wide text-[var(--color-foreground)]">
              {account.accountNumber}
            </span>
            <button
              type="button"
              onClick={copy}
              className="text-[var(--color-muted)] transition hover:text-[var(--color-foreground)]"
              aria-label="Copy account number"
            >
              {copied ? (
                <Check className="h-4 w-4 text-[var(--color-up)]" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>

          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-muted)]">Bank</dt>
              <dd className="text-right text-[var(--color-foreground)]">{account.bankName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-muted)]">Account name</dt>
              <dd className="text-right text-[var(--color-foreground)]">{account.accountName}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-sm leading-relaxed text-[var(--color-muted)]">
            Transfer from any Nigerian bank to the account above. It belongs to you alone, so
            there&apos;s no reference or note to add — anything you send lands in your balance
            automatically, usually within a few minutes.
          </p>
        </div>
      </div>
    );
  }

  const complete =
    form.firstName.trim() !== "" &&
    form.lastName.trim() !== "" &&
    /^(\+?234|0)\d{10}$/.test(form.phone.replace(/[\s-]/g, "")) &&
    /^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth) &&
    /^\d{11}$/.test(form.bvn);

  const field = (
    key: keyof typeof form,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className="block">
      <span className="text-xs text-[var(--color-muted)]">{label}</span>
      <input
        {...props}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-accent)]"
      />
    </label>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-[var(--color-muted)]">
        To deposit naira you need your own account number. Nigerian banking rules require us to
        verify your identity before we can open one.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {field("firstName", "First name", { autoComplete: "given-name" })}
        {field("lastName", "Last name", { autoComplete: "family-name" })}
      </div>
      {field("phone", "Phone number", { placeholder: "08012345678", inputMode: "tel" })}
      {field("dateOfBirth", "Date of birth", { type: "date" })}
      {field("bvn", "BVN", { inputMode: "numeric", maxLength: 11, placeholder: "11 digits" })}

      {/* Stated plainly and next to the field, where it actually informs the
          decision to type it in. */}
      <p className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-3 text-xs leading-relaxed text-[var(--color-muted)]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
        <span>
          Your BVN is sent to our licensed banking partner to open the account and is never stored
          on our systems. It does not give us access to your bank account.
        </span>
      </p>

      {error && <p className="text-sm text-[var(--color-down)]">{error}</p>}

      <button
        type="button"
        disabled={busy || !complete}
        onClick={submit}
        className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
      >
        {busy ? "Opening your account…" : "Open naira account"}
      </button>
    </div>
  );
}
