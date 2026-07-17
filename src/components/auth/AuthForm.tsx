"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const AFTER_AUTH = "/trade/BTC-USDT";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isLogin = mode === "login";

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!isLogin) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) {
          setError((await res.json()).error ?? "Could not create your account.");
          setLoading(false);
          return;
        }
        const s = await signIn("credentials", { email, password, redirect: false });
        if (s?.error) {
          setError("Account created — but sign-in failed. Please log in.");
          setLoading(false);
          return;
        }
        router.push(AFTER_AUTH);
        router.refresh();
        return;
      }

      // Login — with an optional 2FA code step.
      const s = await signIn("credentials", {
        email,
        password,
        code: needCode ? code : undefined,
        redirect: false,
      });
      if (!s?.error) {
        router.push(AFTER_AUTH);
        router.refresh();
        return;
      }
      if (needCode) {
        setError("That code is incorrect or expired.");
        setLoading(false);
        return;
      }
      // First attempt failed — check whether 2FA is the reason.
      const chk = await fetch("/api/auth/2fa/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const cj = (await chk.json().catch(() => ({}))) as { needs2FA?: boolean; error?: string };
      if (chk.ok && cj.needs2FA) {
        setNeedCode(true);
        setError(null);
      } else if (chk.status === 403) {
        setError(cj.error ?? "This account has been suspended.");
      } else {
        setError("Invalid email or password.");
      }
      setLoading(false);
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
        <h1 className="text-xl font-semibold">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {isLogin
            ? "Sign in to your OKNexus account."
            : "Start trading on OKNexus in seconds."}
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {!isLogin ? (
            <Field
              label="Name (optional)"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Satoshi"
              autoComplete="name"
            />
          ) : null}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@email.com"
            autoComplete="email"
            required
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={isLogin ? "Your password" : "At least 8 characters"}
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
          />

          {isLogin && !needCode ? (
            <div className="-mt-1 text-right">
              <Link
                href="/forgot-password"
                className="text-xs text-[var(--color-accent)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          ) : null}

          {isLogin && needCode ? (
            <div>
              <Field
                label="Authenticator code"
                type="text"
                value={code}
                onChange={(v) => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="123456"
                autoComplete="one-time-code"
                required
              />
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Enter the 6-digit code from your authenticator app.
              </p>
            </div>
          ) : null}

          {error ? <div className="text-sm text-[var(--color-down)]">{error}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-brand w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isLogin ? (needCode ? "Verify code" : "Sign in") : "Create account"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-[var(--color-muted)]">
          {isLogin ? (
            <>
              No account?{" "}
              <Link href="/register" className="text-[var(--color-accent)] hover:underline">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-[var(--color-accent)] hover:underline">
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs text-[var(--color-muted)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
      />
    </label>
  );
}
