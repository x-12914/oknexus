"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, TriangleAlert, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Choose a password of at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Could not reset your password.");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="flex justify-center mb-6">
        <Logo />
      </Link>
      <div className="rounded-2xl glass p-6">
        {!token ? (
          <>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-2)]">
              <TriangleAlert className="h-5 w-5 text-[var(--color-down)]" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Invalid reset link</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              This link is missing or malformed. Request a fresh one to continue.
            </p>
            <Link
              href="/forgot-password"
              className="btn-brand mt-5 w-full py-2.5 rounded-lg font-medium flex items-center justify-center"
            >
              Request a new link
            </Link>
          </>
        ) : done ? (
          <>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-2)]">
              <CheckCircle2 className="h-5 w-5 text-[var(--color-up)]" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Password updated</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Your password has been changed. You can now sign in with your new password.
            </p>
            <Link
              href="/login"
              className="btn-brand mt-5 w-full py-2.5 rounded-lg font-medium flex items-center justify-center"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Choose a new password</h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Enter a new password for your OKNexus account.
            </p>
            <form onSubmit={submit} className="mt-5 space-y-3">
              <label className="block">
                <span className="text-xs text-[var(--color-muted)]">New password</span>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    required
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-foreground)] p-1 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="text-xs text-[var(--color-muted)]">Confirm password</span>
                <div className="relative mt-1">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    required
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-foreground)] p-1 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              {error ? <div className="text-sm text-[var(--color-down)]">{error}</div> : null}
              <button
                type="submit"
                disabled={loading}
                className="btn-brand w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Update password
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
