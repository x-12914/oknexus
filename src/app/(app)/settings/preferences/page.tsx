"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "light" | "dark";

function subscribe(callback: () => void) {
  const obs = new MutationObserver(callback);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => obs.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export default function PreferencesPage() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light");

  const setTheme = (next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // ignore
    }
  };

  return (
    <div className="h-full p-6 lg:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Preferences</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Customize your OKNexus experience.
        </p>
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
            <h3 className="font-medium text-[var(--color-foreground)]">Appearance</h3>
            <p className="mt-1 text-xs text-[var(--color-muted)]">Choose between Light and Dark mode.</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  theme === "dark"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-foreground)] hover:bg-[var(--color-border)]"
                }`}
              >
                <Moon className="h-4 w-4" />
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  theme === "light"
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-foreground)] hover:bg-[var(--color-border)]"
                }`}
              >
                <Sun className="h-4 w-4" />
                Light
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
