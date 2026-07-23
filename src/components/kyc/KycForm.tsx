"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, ShieldCheck, Clock, XCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { KycInfo } from "@/lib/admin-types";

export function KycForm() {
  const [info, setInfo] = useState<KycInfo | null>(null);
  const [legalName, setLegalName] = useState("");
  const [country, setCountry] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => api.kyc().then(setInfo).catch(() => {}), []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await api.kycSubmit({ legalName, country, idNumber });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const status = info?.status ?? "NONE";
  const canSubmit =
    legalName.trim() && country.trim() && idNumber.trim() && !submitting && status !== "APPROVED";

  const banner: Record<string, { cls: string; text: string; icon: React.ReactNode }> = {
    APPROVED: {
      cls: "border-[var(--color-up)]/40 bg-[var(--color-up)]/10 text-[var(--color-up)]",
      text: "Your identity is verified.",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    PENDING: {
      cls: "border-amber-500/40 bg-amber-500/10 text-amber-500",
      text: "Your submission is under review.",
      icon: <Clock className="h-4 w-4" />,
    },
    REJECTED: {
      cls: "border-[var(--color-down)]/40 bg-[var(--color-down)]/10 text-[var(--color-down)]",
      text: "Your last submission was rejected. Please re-submit.",
      icon: <XCircle className="h-4 w-4" />,
    },
  };
  const b = banner[status];

  return (
    <div className="p-6 max-w-md mx-auto">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to settings
      </Link>
      <h1 className="text-xl font-semibold mb-1">Identity verification</h1>
      <p className="text-sm text-[var(--color-muted)] mb-4">
        Verify your identity to unlock higher limits. A reviewer checks each submission.
      </p>

      {b ? (
        <div className={cn("rounded-lg border px-3 py-2 text-sm mb-4 flex items-center gap-2", b.cls)}>
          {b.icon} {b.text}
        </div>
      ) : null}

      {status !== "APPROVED" ? (
        <div className="rounded-2xl glass p-4 space-y-3">
          <Field label="Full legal name" value={legalName} onChange={setLegalName} placeholder="Ada Lovelace" />
          <Field label="Country of residence" value={country} onChange={setCountry} placeholder="Nigeria" />
          <Field
            label="Government ID number"
            value={idNumber}
            onChange={setIdNumber}
            placeholder="Passport / national ID"
          />
          {error ? <div className="text-sm text-[var(--color-down)]">{error}</div> : null}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className={cn(
              "w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2",
              canSubmit ? "btn-brand" : "bg-[var(--color-surface-2)] text-[var(--color-muted)] cursor-not-allowed",
            )}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {status === "PENDING" ? "Re-submit" : "Submit for review"}
          </button>
          <p className="text-[11px] text-[var(--color-muted)] text-center">
            Demo KYC — details are stored for manual admin review, not sent to a real provider.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-xs text-[var(--color-muted)] mb-1">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
      />
    </label>
  );
}
