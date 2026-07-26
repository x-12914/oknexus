"use client";

import { useState } from "react";
import { Loader2, KeyRound, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export function PasswordManagementCard() {
  const [step, setStep] = useState<"IDLE" | "OTP" | "DONE">("IDLE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSendOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/send-otp", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Failed to send verification email. Please try again.");
      } else {
        setStep("OTP");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ otp, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Failed to change password. Please check your code.");
      } else {
        setStep("DONE");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "DONE") {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-up-bg)]">
            <CheckCircle2 className="h-5 w-5 text-[var(--color-up)]" />
          </div>
          <div>
            <h3 className="font-medium text-[var(--color-foreground)]">Password changed</h3>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Your password has been successfully updated. All other active sessions have been signed out.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium text-[var(--color-foreground)] flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[var(--color-muted)]" /> Password Management
          </h3>
          <p className="mt-1 text-xs text-[var(--color-muted)] max-w-sm">
            Change or reset your password. You will need to verify your email address to proceed.
          </p>
        </div>
        {step === "IDLE" && (
          <button
            onClick={handleSendOtp}
            disabled={loading}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-surface-2)] disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Change password
          </button>
        )}
      </div>

      {error && step === "IDLE" && (
        <div className="mt-3 text-sm text-[var(--color-down)]">{error}</div>
      )}

      {step === "OTP" && (
        <form onSubmit={handleChangePassword} className="mt-5 space-y-4 rounded-xl border border-[var(--color-border)] p-4">
          <div>
            <p className="text-sm font-medium">Verify your email</p>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              We sent a 6-digit code to your email. Enter it below to authorize this password change.
            </p>
          </div>
          
          <label className="block">
            <span className="text-xs text-[var(--color-muted)]">Verification code</span>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm tabular-nums tracking-widest outline-none focus:border-[var(--color-accent)]"
              required
            />
          </label>

          <label className="block">
            <span className="text-xs text-[var(--color-muted)]">New password</span>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 pr-10 text-sm outline-none focus:border-[var(--color-accent)]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-foreground)] p-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="text-xs text-[var(--color-muted)]">Confirm new password</span>
            <div className="relative mt-1">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 pr-10 text-sm outline-none focus:border-[var(--color-accent)]"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-foreground)] p-1"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {error && <div className="text-sm text-[var(--color-down)]">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep("IDLE")}
              className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-brand flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Update password
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
