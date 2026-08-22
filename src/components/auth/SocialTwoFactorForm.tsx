"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

/**
 * Second leg of a social sign-in for accounts with 2FA switched on. The OAuth
 * callback left a short-lived challenge cookie instead of a session; this posts
 * the authenticator code to the `oauth-2fa` provider to finish the job.
 */
export function SocialTwoFactorForm({ provider }: { provider: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("oauth-2fa", { code, redirect: false });
      if (res?.error) {
        setError(
          res.code === "CredentialsSignin" || !res.code
            ? "That code is incorrect or expired. Check your authenticator app and try again."
            : res.code,
        );
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
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
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(139,92,246,0.12)] mb-4">
          <ShieldCheck className="h-6 w-6 text-[var(--color-accent)]" />
        </div>
        <h1 className="text-xl font-semibold">Two-factor authentication</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {provider} confirmed who you are. Enter the 6-digit code from your authenticator app to
          finish signing in.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-xs text-[var(--color-muted)]">Authenticator code</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="000000"
              autoComplete="one-time-code"
              autoFocus
              required
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-center font-mono text-lg tracking-[0.3em] outline-none focus:border-[var(--color-accent)]"
            />
          </label>

          {error ? <div className="text-sm text-[var(--color-down)]">{error}</div> : null}

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="btn-brand flex w-full items-center justify-center gap-2 rounded-lg py-2.5 font-medium disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Verify and sign in
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
          Lost your authenticator?{" "}
          <Link href="/login" className="text-[var(--color-accent)] hover:underline">
            Sign in another way
          </Link>
        </p>
      </div>
    </div>
  );
}
