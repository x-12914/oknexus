"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SocialProviderButton {
  id: string;
  label: string;
}

/** Brand glyphs, drawn on a 24×24 grid. Monochrome ones inherit `currentColor`. */
const ICONS: Record<string, React.ReactNode> = {
  google: (
    <>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.93l-3.88-3a7.2 7.2 0 0 1-10.71-3.78H1.34v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.35 14.29a7.19 7.19 0 0 1 0-4.58V6.62H1.34a12 12 0 0 0 0 10.76l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.34 6.62l4.01 3.09A7.15 7.15 0 0 1 12 4.75Z"
      />
    </>
  ),
  apple: (
    <path
      fill="currentColor"
      d="M17.05 12.54c-.03-2.75 2.25-4.07 2.35-4.13-1.28-1.87-3.27-2.13-3.98-2.16-1.7-.17-3.31.99-4.17.99-.86 0-2.19-.97-3.6-.94-1.85.03-3.55 1.07-4.5 2.72-1.92 3.33-.49 8.26 1.38 10.96.92 1.32 2.01 2.8 3.45 2.75 1.38-.06 1.9-.89 3.57-.89 1.67 0 2.14.89 3.6.86 1.49-.03 2.43-1.35 3.34-2.68 1.05-1.54 1.49-3.03 1.51-3.11-.03-.01-2.9-1.11-2.93-4.4l-.02.03ZM14.3 4.3c.76-.92 1.27-2.2 1.13-3.47-1.09.04-2.42.73-3.2 1.64-.7.81-1.31 2.11-1.15 3.36 1.22.09 2.46-.62 3.22-1.53Z"
    />
  ),
  facebook: (
    <path
      fill="#1877F2"
      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z"
    />
  ),
  github: (
    <path
      fill="currentColor"
      d="M12 .3a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.65 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .3Z"
    />
  ),
  linkedin: (
    <path
      fill="#0A66C2"
      d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z"
    />
  ),
  coinbase: (
    <path
      fill="#0052FF"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 24c6.63 0 12-5.37 12-12S18.63 0 12 0 0 5.37 0 12s5.37 12 12 12ZM9.6 8.4a1.2 1.2 0 0 0-1.2 1.2v4.8a1.2 1.2 0 0 0 1.2 1.2h4.8a1.2 1.2 0 0 0 1.2-1.2V9.6a1.2 1.2 0 0 0-1.2-1.2H9.6Z"
    />
  ),
  discord: (
    <path
      fill="#5865F2"
      d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.011c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.01c.12.099.246.198.373.292a.077.077 0 0 1-.007.128c-.598.349-1.22.65-1.873.891a.077.077 0 0 0-.04.107c.36.698.771 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.029ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.946 2.418-2.157 2.418Z"
    />
  ),
  twitter: (
    <path
      fill="currentColor"
      d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z"
    />
  ),
};

/** Beyond this many, the rest hide behind a "more options" toggle so the email
 * form doesn't get pushed off the first screen. */
const VISIBLE_BY_DEFAULT = 4;

export function SocialButtons({
  providers,
  redirectTo,
  className,
}: {
  providers: SocialProviderButton[];
  redirectTo: string;
  className?: string;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (providers.length === 0) return null;

  const hasOverflow = providers.length > VISIBLE_BY_DEFAULT;
  const shown = hasOverflow && !expanded ? providers.slice(0, VISIBLE_BY_DEFAULT) : providers;

  return (
    <div className={className}>
      <div
        className={cn(
          "grid gap-2",
          providers.length > 2 ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        {shown.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={pending !== null}
            onClick={() => {
              setPending(p.id);
              // Full-page redirect to the provider — no need to reset `pending`.
              void signIn(p.id, { redirectTo });
            }}
            className="flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface)] disabled:opacity-60"
          >
            {pending === p.id ? (
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
                {ICONS[p.id] ?? null}
              </svg>
            )}
            <span className="truncate">{p.label}</span>
          </button>
        ))}
      </div>

      {hasOverflow && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline"
        >
          More sign-in options
        </button>
      ) : null}

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-xs text-[var(--color-muted)]">or continue with email</span>
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>
    </div>
  );
}
