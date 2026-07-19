"use client";

import { useState } from "react";
import { MailWarning, X, Loader2, CheckCircle2 } from "lucide-react";

export function EmailVerifyBanner({ email }: { email: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  if (dismissed) return null;

  const resend = async () => {
    setState("sending");
    setMsg(null);
    try {
      const res = await fetch("/api/auth/verify-email/resend", { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        alreadyVerified?: boolean;
      };
      if (res.ok) {
        setState("sent");
        setMsg(j.alreadyVerified ? "Your email is already verified." : "Verification email sent.");
      } else {
        setState("error");
        setMsg(j.error ?? "Could not send the email.");
      }
    } catch {
      setState("error");
      setMsg("Could not send the email.");
    }
  };

  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-4 py-2.5 text-sm">
      <MailWarning className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
      <div className="min-w-0 flex-1">
        {state === "sent" ? (
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[var(--color-up)]" /> {msg}
          </span>
        ) : (
          <span>
            Verify your email
            {email ? (
              <>
                {" "}
                (<span className="font-medium">{email}</span>)
              </>
            ) : null}{" "}
            to fully secure your account.
            {state === "error" && msg ? (
              <span className="ml-1 text-[var(--color-down)]">{msg}</span>
            ) : null}
          </span>
        )}
      </div>
      {state !== "sent" ? (
        <button
          type="button"
          onClick={resend}
          disabled={state === "sending"}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--color-accent)] px-3 py-1 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 disabled:opacity-60"
        >
          {state === "sending" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Resend link
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
