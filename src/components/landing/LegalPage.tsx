import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

/**
 * Shell for the long-form legal pages (/privacy, /terms). Same committed-dark
 * palette as the rest of the marketing site, applied through inline custom
 * properties so it ignores the in-app theme toggle.
 *
 * Text supports a `{{placeholder}}` marker, rendered highlighted, for details
 * only the operator can supply (legal entity, governing law, contact address).
 */

const landingStyle = {
  colorScheme: "dark",
  background: "#08060f",
  color: "#f5f3fc",
  "--color-background": "#08060f",
  "--color-surface": "#110d20",
  "--color-surface-2": "#181231",
  "--color-border": "#241d3f",
  "--color-foreground": "#f5f3fc",
  "--color-muted": "#a3a0c4",
  "--color-accent": "#9b6bff",
  "--color-accent-hover": "#ac81ff",
  "--color-up": "#2ee0a8",
  "--color-up-bg": "rgba(46,224,168,0.12)",
  "--color-down": "#ff6a8a",
  "--color-down-bg": "rgba(255,106,138,0.12)",
  "--glass-bg": "rgba(22,17,42,0.62)",
  "--glass-border": "rgba(255,255,255,0.08)",
  "--glass-shadow": "0 24px 70px rgba(0,0,0,0.55)",
  "--topbar-bg": "rgba(8,6,15,0.72)",
} as CSSProperties;

export type LegalBlock = string | { list: string[] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

/** Split on {{...}} so operator-supplied gaps are impossible to miss on the page. */
function withPlaceholders(text: string): ReactNode[] {
  return text.split(/(\{\{[^}]+\}\})/g).map((part, i) => {
    if (!part.startsWith("{{")) return part;
    return (
      <span
        key={i}
        className="rounded bg-[var(--color-accent)]/15 px-1.5 py-0.5 font-mono text-[0.9em] text-[var(--color-accent)]"
      >
        {part.slice(2, -2)}
      </span>
    );
  });
}

export function LegalPage({
  title,
  intro,
  updated,
  sections,
  draft = false,
}: {
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
  /** Set false once counsel has signed the text off, which removes the notice. */
  draft?: boolean;
}) {
  return (
    <div className="relative min-h-screen overflow-x-clip" style={landingStyle}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]">
        <div
          className="absolute left-1/2 top-[-160px] h-[520px] w-[820px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background: "radial-gradient(50% 50% at 50% 50%, rgba(124,92,246,0.25), transparent 70%)",
          }}
        />
      </div>

      <LandingHeader />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-16">
        <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-[var(--color-muted)]">Last updated {updated}</p>
        <p className="mt-6 text-base leading-relaxed text-[var(--color-muted)]">{intro}</p>

        {draft ? (
          <div className="mt-8 flex gap-3 rounded-xl border border-[var(--color-down)]/40 bg-[var(--color-down-bg)] p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-down)]" />
            <p className="text-sm leading-relaxed text-[var(--color-foreground)]">
              <span className="font-semibold">Draft pending legal review.</span> This document
              describes how the platform currently works, but it has not yet been reviewed or
              approved by legal counsel and is not a final, binding policy. Highlighted fields are
              still to be completed.
            </p>
          </div>
        ) : null}

        <div className="mt-12 space-y-12">
          {sections.map((section, i) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold text-white">
                <span className="mr-3 text-[var(--color-accent)]">{i + 1}.</span>
                {section.heading}
              </h2>
              <div className="mt-4 space-y-4">
                {section.blocks.map((block, j) =>
                  typeof block === "string" ? (
                    <p key={j} className="text-sm leading-relaxed text-[var(--color-muted)]">
                      {withPlaceholders(block)}
                    </p>
                  ) : (
                    <ul
                      key={j}
                      className="ml-1 space-y-2 border-l border-[var(--color-border)] pl-5 text-sm leading-relaxed text-[var(--color-muted)]"
                    >
                      {block.list.map((item, k) => (
                        <li key={k}>{withPlaceholders(item)}</li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
