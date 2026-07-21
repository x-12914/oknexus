"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff, Mail } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const AFTER_AUTH = "/trade/BTC-USDT";

type Step = "form" | "verify-otp";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isLogin = mode === "login";

  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(""); // for 2FA
  const [needCode, setNeedCode] = useState(false); // 2FA step

  // ── Registration submit ───────────────────────────────────────────────────
  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = (await res.json()) as { ok?: boolean; needsVerification?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create your account.");
        setLoading(false);
        return;
      }
      if (data.needsVerification) {
        setStep("verify-otp");
        setLoading(false);
        return;
      }
      // Email not configured (dev mode) — sign in immediately.
      const s = await signIn("credentials", { email, password, redirect: false });
      if (s?.error) {
        setError("Account created — but sign-in failed. Please log in.");
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

  // ── OTP submit ────────────────────────────────────────────────────────────
  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Invalid code. Please try again.");
        setLoading(false);
        return;
      }
      // Email confirmed — sign in.
      const s = await signIn("credentials", { email, password, redirect: false });
      if (s?.error) {
        setError("Email verified — but sign-in failed. Please log in.");
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

  // ── OTP resend ────────────────────────────────────────────────────────────
  const resendOtp = async () => {
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/verify-email/confirm", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setInfo("A new code has been sent to your email.");
      } else {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "Could not resend the code.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  // ── Login submit ──────────────────────────────────────────────────────────
  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
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
      if (s.error === "EMAIL_NOT_VERIFIED") {
        setError("Please verify your email before signing in. Check your inbox for a code.");
        setLoading(false);
        return;
      }
      if (needCode) {
        setError("That code is incorrect or expired.");
        setLoading(false);
        return;
      }
      // Check whether 2FA is the reason.
      const chk = await fetch("/api/auth/2fa/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const cj = (await chk.json().catch(() => ({}))) as {
        needs2FA?: boolean;
        error?: string;
        emailNotVerified?: boolean;
      };
      if (chk.ok && cj.needs2FA) {
        setNeedCode(true);
        setError(null);
      } else if (chk.status === 429) {
        setError(cj.error ?? "Too many attempts. Please try again later.");
      } else if (chk.status === 403 && cj.emailNotVerified) {
        setError("Your email has not been verified. Please check your inbox for a verification code.");
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

  // ── Render: OTP verification step ─────────────────────────────────────────
  if (step === "verify-otp") {
    return (
      <div className="w-full max-w-sm">
        <Link href="/" className="flex justify-center mb-6">
          <Logo />
        </Link>
        <div className="rounded-2xl glass p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(139,92,246,0.12)] mb-4">
            <Mail className="h-6 w-6 text-[var(--color-accent)]" />
          </div>
          <h1 className="text-xl font-semibold">Verify your email</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            We sent a 6-digit code to <span className="text-[var(--color-foreground)] font-medium">{email}</span>. Enter it below to activate your account.
          </p>

          <form onSubmit={submitOtp} className="mt-5 space-y-3">
            <label className="block">
              <span className="text-xs text-[var(--color-muted)]">Verification code</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="000000"
                autoComplete="one-time-code"
                required
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] tracking-[0.3em] text-center font-mono text-lg"
              />
            </label>

            {error ? <div className="text-sm text-[var(--color-down)]">{error}</div> : null}
            {info ? <div className="text-sm text-[var(--color-up)]">{info}</div> : null}

            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="btn-brand w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm email
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
            Didn&apos;t receive a code?{" "}
            <button
              type="button"
              onClick={resendOtp}
              className="text-[var(--color-accent)] hover:underline"
            >
              Resend
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ── Render: main form ─────────────────────────────────────────────────────
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

        <form onSubmit={isLogin ? submitLogin : submitRegister} className="mt-5 space-y-3">
          {!isLogin ? (
            <Field
              label="Name"
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
            showPasswordToggle
            onTogglePassword={() => setShowPassword((v) => !v)}
            isPasswordShown={showPassword}
          />

          {!isLogin ? (
            <Field
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
              showPasswordToggle
              onTogglePassword={() => setShowConfirm((v) => !v)}
              isPasswordShown={showConfirm}
            />
          ) : null}

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
  showPasswordToggle,
  onTogglePassword,
  isPasswordShown,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  isPasswordShown?: boolean;
}) {
  const actualType = showPasswordToggle ? (isPasswordShown ? "text" : "password") : type;

  return (
    <label className="block">
      <span className="text-xs text-[var(--color-muted)]">{label}</span>
      <div className="relative mt-1">
        <input
          type={actualType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={cn(
            "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]",
            showPasswordToggle && "pr-10"
          )}
        />
        {showPasswordToggle ? (
          <button
            type="button"
            onClick={onTogglePassword}
            tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-foreground)] p-1 transition-colors"
            aria-label={isPasswordShown ? "Hide password" : "Show password"}
          >
            {isPasswordShown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
    </label>
  );
}
