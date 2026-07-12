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

export function ThemeToggle() {
  // The <html> data-theme attribute is the source of truth (set pre-paint by the
  // inline script in the layout); reading it as external state avoids a flash.
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light");

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="p-2 rounded-md text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
