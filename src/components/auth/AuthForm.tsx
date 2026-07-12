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
      }

      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError(
          isLogin
            ? "Invalid email or password."
            : "Account created — but sign-in failed. Please log in.",
        );
        setLoading(false);
        return;
      }
      router.push(AFTER_AUTH);
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
        <h1 className="text-xl font-semibold">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {isLogin
            ? "Sign in to your Nexus account."
            : "Start trading on Nexus in seconds."}
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

          {error ? <div className="text-sm text-[var(--color-down)]">{error}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-brand w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isLogin ? "Sign in" : "Create account"}
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
