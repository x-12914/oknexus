"use client";

import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";

type Event = { id: string; device: string; ip: string | null; at: number };

function relative(ms: number, now: number): string {
  const sec = Math.max(0, Math.round((now - ms) / 1000));
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min${min === 1 ? "" : "s"} ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
  return new Date(ms).toLocaleDateString();
}

export function LoginHistory({ events }: { events: Event[] }) {
  // Compute relative times only after mount so server/client markup matches.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  return (
    <div className="rounded-2xl glass p-6">
      <h2 className="text-lg font-semibold">Login history</h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Recent sign-ins to your account. If you don&apos;t recognise one, change your password.
      </p>
      {events.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-muted)]">No sign-ins recorded yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--color-border)]">
          {events.map((e, i) => (
            <li key={e.id} className="flex items-center gap-3 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)]">
                <Monitor className="h-4 w-4 text-[var(--color-muted)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{e.device}</span>
                  {i === 0 ? (
                    <span className="rounded-full bg-[var(--color-up)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-up)]">
                      Latest
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-[var(--color-muted)]">
                  {e.ip ?? "Unknown IP"}
                  {now !== null ? <> · {relative(e.at, now)}</> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
