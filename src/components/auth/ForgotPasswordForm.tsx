"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Ignore — we show the same neutral confirmation regardless.
    }
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="flex justify-center mb-6">
        <Logo />
      </Link>
      <div className="rounded-2xl glass p-6">
        {sent ? (
          <>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-2)]">
              <MailCheck className="h-5 w-5 text-[var(--color-accent)]" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Check your email</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              If an account exists for{" "}
              <span className="text-[var(--color-foreground)]">{email}</span>, we&apos;ve sent a
              link to reset your password. It expires in 30 minutes.
            </p>
            <Link
              href="/login"
              className="btn-brand mt-5 w-full py-2.5 rounded-lg font-medium flex items-center justify-center"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Reset your password</h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Enter your email and we&apos;ll send you a link to set a new password.
            </p>
            <form onSubmit={submit} className="mt-5 space-y-3">
              <label className="block">
                <span className="text-xs text-[var(--color-muted)]">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="btn-brand w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send reset link
              </button>
            </form>
            <div className="mt-4 text-center text-sm text-[var(--color-muted)]">
              Remembered it?{" "}
              <Link href="/login" className="text-[var(--color-accent)] hover:underline">
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
