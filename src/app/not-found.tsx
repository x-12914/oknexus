import Link from "next/link";

export const metadata = { title: "Page not found · OKNexus" };

/** 404. A server component — nothing here can fail. */
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold tracking-widest text-[var(--color-muted)]">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--color-foreground)]">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
          The link may be out of date, or the page may have moved.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link
            href="/"
            className="rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)]"
          >
            Go home
          </Link>
          <Link
            href="/help"
            className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-surface-2)]"
          >
            Help Center
          </Link>
        </div>
      </div>
    </div>
  );
}
