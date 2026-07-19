"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

async function post(path: string, body?: unknown) {
  const r = await fetch(path, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? "Something went wrong.");
  return j as { qr?: string; secret?: string };
}

const codeInput =
  "mt-1 w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-lg tracking-[0.3em] tabular-nums outline-none focus:border-[var(--color-accent)]";

export function TwoFactorCard({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [step, setStep] = useState<"idle" | "setup" | "disable">("idle");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCode = (v: string) => setCode(v.replace(/[^0-9]/g, "").slice(0, 6));

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const startSetup = () =>
    run(async () => {
      const j = await post("/api/auth/2fa/setup");
      setQr(j.qr ?? "");
      setSecret(j.secret ?? "");
      setCode("");
      setStep("setup");
    });

  const confirmEnable = () =>
    run(async () => {
      await post("/api/auth/2fa/enable", { code });
      setEnabled(true);
      setStep("idle");
      setQr("");
      setSecret("");
      setCode("");
    });

  const confirmDisable = () =>
    run(async () => {
      await post("/api/auth/2fa/disable", { code });
      setEnabled(false);
      setStep("idle");
      setCode("");
    });

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--color-accent)]" />
            <h2 className="font-semibold">Two-factor authentication</h2>
            {enabled ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                On
              </span>
            ) : null}
          </div>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-[var(--color-muted)]">
            Require a code from an authenticator app (Google Authenticator, Authy) each time you sign
            in — so a password alone isn&apos;t enough to access your account.
          </p>
        </div>
        {step === "idle" ? (
          enabled ? (
            <button
              type="button"
              onClick={() => {
                setStep("disable");
                setCode("");
                setError(null);
              }}
              className="shrink-0 rounded-full border border-[var(--color-border)] px-4 py-2 text-sm transition-colors hover:border-[var(--color-down)] hover:text-[var(--color-down)]"
            >
              Disable
            </button>
          ) : (
            <button
              type="button"
              onClick={startSetup}
              disabled={busy}
              className="btn-brand shrink-0 rounded-full px-5 py-2 text-sm font-medium disabled:opacity-60"
            >
              {busy ? "…" : "Enable"}
            </button>
          )
        ) : null}
      </div>

      {step === "setup" ? (
        <div className="mt-6 border-t border-[var(--color-border)] pt-6">
          <div className="text-sm font-medium">1. Scan this QR code in your authenticator app</div>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- inline data-URI QR
            <img src={qr} alt="2FA setup QR code" width={180} height={180} className="mt-3 rounded-lg bg-white p-2" />
          ) : null}
          <div className="mt-3 text-xs text-[var(--color-muted)]">
            Can&apos;t scan? Enter this key manually:{" "}
            <code className="break-all text-[var(--color-foreground)]">{secret}</code>
          </div>

          <div className="mt-5 text-sm font-medium">2. Enter the 6-digit code to confirm</div>
          <input
            value={code}
            onChange={(e) => onCode(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            className={codeInput}
          />
          {error ? <div className="mt-3 text-sm text-[var(--color-down)]">{error}</div> : null}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={confirmEnable}
              disabled={busy || code.length !== 6}
              className="btn-brand rounded-full px-5 py-2 text-sm font-medium disabled:opacity-60"
            >
              {busy ? "…" : "Confirm & enable"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("idle");
                setError(null);
              }}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {step === "disable" ? (
        <div className="mt-6 border-t border-[var(--color-border)] pt-6">
          <div className="text-sm font-medium">Enter a current code to turn off 2FA</div>
          <input
            value={code}
            onChange={(e) => onCode(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            className={codeInput}
          />
          {error ? <div className="mt-3 text-sm text-[var(--color-down)]">{error}</div> : null}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={confirmDisable}
              disabled={busy || code.length !== 6}
              className="rounded-full border border-[var(--color-down)] px-5 py-2 text-sm font-medium text-[var(--color-down)] transition-colors hover:bg-[var(--color-down)]/10 disabled:opacity-60"
            >
              {busy ? "…" : "Disable 2FA"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("idle");
                setError(null);
              }}
              className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
