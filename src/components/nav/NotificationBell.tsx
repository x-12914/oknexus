"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { api } from "@/lib/api-client";
import { usePolling } from "@/hooks/usePolling";
import { cn } from "@/lib/utils";

function rel(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ms).toLocaleDateString();
}

const DOT: Record<string, string> = {
  DEPOSIT: "bg-[var(--color-up)]",
  WITHDRAWAL: "bg-[var(--color-accent)]",
  TRANSFER: "bg-[var(--color-up)]",
  SECURITY: "bg-amber-500",
  TRADE: "bg-[var(--color-accent)]",
  SYSTEM: "bg-[var(--color-muted)]",
};

export function NotificationBell() {
  const { data, refresh } = usePolling(() => api.notifications(), 20000, []);
  const [open, setOpen] = useState(false);

  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      try {
        await api.markNotificationsRead();
        refresh();
      } catch {
        // ignore — badge just stays until the next poll
      }
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        className="relative p-2 rounded-md hover:bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-down)] px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-20 mt-1 w-80 max-w-[90vw] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
            <div className="border-b border-[var(--color-border)] px-3 py-2 text-sm font-semibold">
              Notifications
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-[var(--color-muted)]">
                  You&apos;re all caught up.
                </div>
              ) : (
                items.map((n) => {
                  const inner = (
                    <div className="flex gap-2.5 px-3 py-2.5 hover:bg-[var(--color-surface-2)]">
                      <span
                        className={cn(
                          "mt-1 h-2 w-2 shrink-0 rounded-full",
                          DOT[n.type] ?? "bg-[var(--color-muted)]",
                          n.read && "opacity-40",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{n.title}</div>
                        <div className="text-xs text-[var(--color-muted)]">{n.body}</div>
                        <div className="mt-0.5 text-[10px] text-[var(--color-muted)]">
                          {rel(n.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                  return n.href ? (
                    <Link
                      key={n.id}
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="block border-b border-[var(--color-border)] last:border-0"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id} className="border-b border-[var(--color-border)] last:border-0">
                      {inner}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
