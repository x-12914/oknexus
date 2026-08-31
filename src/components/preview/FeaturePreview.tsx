import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";

/**
 * A product page for something that isn't live yet.
 *
 * The client wants the platform to look complete rather than be a wall of
 * "coming soon" badges, which is reasonable — a page nobody can lose money on
 * is safe to build. The rule this enforces is the other half of that: the
 * primary action is inert and *says* it is inert, rather than being wired to a
 * simulation. Every money bug found on this platform so far came from something
 * that looked functional and settled against real balances.
 */
export interface PreviewStep {
  title: string;
  body: string;
}

export function FeaturePreview({
  eyebrow,
  title,
  lede,
  icon: Icon,
  steps,
  ctaLabel,
  note,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  icon: LucideIcon;
  steps: PreviewStep[];
  ctaLabel: string;
  note?: string;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              {eyebrow}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">{title}</h1>
          </div>
        </div>

        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[var(--color-muted)]">
          {lede}
        </p>

        {/* Numbered because these genuinely are a sequence — the order is how
            the flow will work, not decoration. */}
        <ol className="mt-8 space-y-3">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="flex gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-xs font-semibold tabular-nums text-[var(--color-muted)]">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[var(--color-foreground)]">{s.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-[var(--color-surface-2)] px-4 py-3 text-sm font-semibold text-[var(--color-muted)]"
          >
            <Lock className="h-4 w-4" />
            {ctaLabel}
          </button>
          <p className="mt-3 text-center text-xs leading-relaxed text-[var(--color-muted)]">
            {note ??
              "This isn't live yet. We'd rather show you exactly what's coming than let a button pretend to work."}
          </p>
        </div>
      </div>
    </div>
  );
}
