import type { CSSProperties } from "react";

/**
 * The dark palette marketing pages render in, regardless of the app theme.
 *
 * Applied as inline CSS variables rather than a class: Tailwind v4's Lightning
 * CSS silently dropped an equivalent class-based block once, so the values that
 * decide whether a page is readable are set where nothing can strip them.
 */
export const landingStyle = {
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
