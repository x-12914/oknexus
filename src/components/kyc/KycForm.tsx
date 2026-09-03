"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Clock, Fingerprint, Loader2, ShieldCheck, UserCheck, XCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { KycInfo } from "@/lib/admin-types";

type Route = "basic" | "bvn" | "full";

interface Banner {
  cls: string;
  text: string;
  icon: React.ReactNode;
}

const GOOD = "border-[var(--color-up)]/40 bg-[var(--color-up)]/10 text-[var(--color-up)]";
const WAIT = "border-amber-500/40 bg-amber-500/10 text-amber-500";
const BAD = "border-[var(--color-down)]/40 bg-[var(--color-down)]/10 text-[var(--color-down)]";

// The BVN and ID routes share one status, because both are full verification.
const FULL_BANNER: Record<string, Banner> = {
  PENDING: {
    cls: WAIT,
    text: "We're processing your verification. This page updates automatically.",
    icon: <Clock className="h-4 w-4" />,
  },
  REJECTED: {
    cls: BAD,
    text: "Your last attempt was rejected. You can try again, or try the other route.",
    icon: <XCircle className="h-4 w-4" />,
  },
  REVIEW: {
    cls: WAIT,
    text: "Your verification is under manual review. We'll update you shortly.",
    icon: <Clock className="h-4 w-4" />,
  },
};

// No reviewer sits behind the basic route, so a partial match is advice, not a
// queue: fix the spelling, or take a full route.
const BASIC_BANNER: Record<string, Banner> = {
  APPROVED: {
    cls: GOOD,
    text: "Your name and NIN matched the register. Your Basic limit is active.",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  PENDING: {
    cls: WAIT,
    text: "Checking your details against the register. This page updates automatically.",
    icon: <Clock className="h-4 w-4" />,
  },
  REJECTED: {
    cls: BAD,
    text: "Your details didn't match the register. Check your name is spelt as registered, or use full verification.",
    icon: <XCircle className="h-4 w-4" />,
  },
  REVIEW: {
    cls: WAIT,
    text: "Your details only partly matched. Try again with your name exactly as registered, or use full verification.",
    icon: <Clock className="h-4 w-4" />,
  },
};

export function KycForm() {
  const [info, setInfo] = useState<KycInfo | null>(null);
  const [legalName, setLegalName] = useState("");
  const [country, setCountry] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState<Route | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => api.kyc().then(setInfo).catch(() => {}), []);
  useEffect(() => {
    load();
  }, [load]);

  const status = info?.status ?? "NONE";
  const basic = info?.basicStatus ?? "NONE";
  const processing = status === "PENDING" || basic === "PENDING";

  // While a hosted verification is processing, poll so the result lands without a manual refresh.
  useEffect(() => {
    if (!info?.automated || !processing) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [info?.automated, processing, load]);

  const start = async (route: Route) => {
    setError(null);
    setStarting(route);
    try {
      const { url } = await api.kycStart(route);
      window.location.href = url; // hand off to the hosted verification flow
    } catch (e) {
      setError((e as Error).message);
      setStarting(null);
    }
  };

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

  const canSubmit =
    legalName.trim() && country.trim() && idNumber.trim() && !submitting && status !== "APPROVED";

  const basicCta =
    basic === "APPROVED"
      ? null
      : basic === "PENDING"
        ? "Continue"
        : basic === "NONE"
          ? "Verify with my NIN"
          : "Try again";
  const fullCta = (what: string) =>
    status === "PENDING" ? `Continue with ${what}` : status === "REJECTED" ? `Try again with ${what}` : `Verify with ${what}`;

  const routes = (info?.basicAvailable ? 1 : 0) + (info?.bvnAvailable ? 1 : 0) + 1;

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
        {info?.automated
          ? routes > 1
            ? "Verify your identity to unlock higher limits. Pick the route that suits you."
            : "Verify your identity to unlock higher limits. It only takes about a minute."
          : "Verify your identity to unlock higher limits. A reviewer checks each submission."}
      </p>

      {status === "APPROVED" ? (
        <div className={cn("rounded-lg border px-3 py-2 text-sm mb-4 flex items-center gap-2", GOOD)}>
          <ShieldCheck className="h-4 w-4" /> Your identity is verified.
        </div>
      ) : info?.automated ? (
        <div className="space-y-5">
          {info.basicAvailable && (
            <RouteCard
              icon={<UserCheck className="h-4 w-4 text-[var(--color-accent)]" />}
              title="Quick verification"
              subtitle="Name and NIN. No photos."
              body="We match your name and NIN against the national identity register. Under a minute, and it raises your daily crypto withdrawal limit."
              banner={BASIC_BANNER[basic]}
              cta={basicCta}
              busy={starting === "basic"}
              disabled={starting !== null}
              onClick={() => start("basic")}
            />
          )}

          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Full verification</h2>
              <p className="text-xs text-[var(--color-muted)]">
                Unlocks withdrawals to a bank account and the highest daily limit.
              </p>
            </div>
            {FULL_BANNER[status] ? (
              <div
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm flex items-center gap-2",
                  FULL_BANNER[status].cls,
                )}
              >
                {FULL_BANNER[status].icon} {FULL_BANNER[status].text}
              </div>
            ) : null}
            {status !== "REVIEW" && (
              <>
                {info.bvnAvailable && (
                  <RouteCard
                    icon={<Fingerprint className="h-4 w-4 text-[var(--color-accent)]" />}
                    title="BVN and a selfie"
                    subtitle="No documents. For Nigerian bank customers."
                    body="We match a quick selfie to the photo your bank holds for your BVN. Nothing to photograph or upload."
                    cta={fullCta("BVN")}
                    busy={starting === "bvn"}
                    disabled={starting !== null}
                    onClick={() => start("bvn")}
                  />
                )}
                <RouteCard
                  icon={<ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />}
                  title="ID document and a selfie"
                  subtitle={info.bvnAvailable ? "For anyone without a BVN." : "A photo of your ID and a quick selfie."}
                  body="A photo of your government ID and a quick selfie. We never store your documents on our servers."
                  cta={fullCta("my ID")}
                  busy={starting === "full"}
                  disabled={starting !== null}
                  onClick={() => start("full")}
                />
              </>
            )}
          </section>

          {error ? <div className="text-sm text-[var(--color-down)]">{error}</div> : null}
          <p className="text-[11px] text-[var(--color-muted)] text-center">
            You'll be securely redirected to complete verification, then brought back here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl glass p-4 space-y-3">
          {FULL_BANNER[status] ? (
            <div
              className={cn(
                "rounded-lg border px-3 py-2 text-sm flex items-center gap-2",
                FULL_BANNER[status].cls,
              )}
            >
              {FULL_BANNER[status].icon} {FULL_BANNER[status].text}
            </div>
          ) : null}
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
            Demo KYC details are stored for manual admin review, not sent to a real provider.
          </p>
        </div>
      )}
    </div>
  );
}

function RouteCard({
  icon,
  title,
  subtitle,
  body,
  banner,
  cta,
  busy,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  body: string;
  banner?: Banner;
  /** Null hides the button: nothing for the user to do on this route right now. */
  cta: string | null;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="rounded-2xl glass p-4 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{title}</h3>
          <p className="text-xs text-[var(--color-muted)]">{subtitle}</p>
        </div>
      </div>
      {banner ? (
        <div className={cn("rounded-lg border px-3 py-2 text-sm flex items-center gap-2", banner.cls)}>
          {banner.icon} {banner.text}
        </div>
      ) : null}
      <p className="text-sm text-[var(--color-muted)]">{body}</p>
      {cta ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          className="btn-brand w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
          {cta}
        </button>
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
