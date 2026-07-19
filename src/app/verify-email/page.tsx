import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const ok = status === "success";

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: ok ? "rgba(16,185,129,0.12)" : "rgba(229,72,77,0.12)" }}>
          {ok ? (
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          ) : (
            <XCircle className="h-7 w-7 text-red-500" />
          )}
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-[var(--color-foreground)]">
          {ok ? "Email verified" : "Link invalid or expired"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          {ok
            ? "Thanks — your email is confirmed and your OKNexus account is fully set up."
            : "This verification link is no longer valid. Sign in and request a new one from your account."}
        </p>
        <Link
          href={ok ? "/dashboard" : "/login"}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#0b0a12] transition-colors hover:bg-white/90"
        >
          {ok ? "Go to dashboard" : "Sign in"}
        </Link>
      </div>
    </main>
  );
}
