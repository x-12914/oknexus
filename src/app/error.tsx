"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Segment-level error boundary.
 *
 * Unlike global-error this renders inside the root layout, so the app's fonts,
 * theme and styles are all still available and it can use the design tokens.
 * Most failures land here; global-error only takes over when the layout itself
 * is what broke.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error.digest ?? "", error.message);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
          This page didn&apos;t load. Your account and balances are unaffected — nothing was
          changed by this error.
        </p>

        <div className="mt-7 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-surface-2)]"
          >
            Go home
          </Link>
        </div>

        {/* The only thread connecting what the user saw to our server logs. */}
        {error.digest && (
          <p className="mt-6 text-xs text-[var(--color-muted)]">
            Reference: <code className="font-mono">{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  );
}
