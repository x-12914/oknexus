"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Last-resort error page.
 *
 * Replaces the root layout when the failure is in the layout itself, so it has
 * to supply its own html and body and cannot rely on anything above it. That
 * also means no fonts and no theme script: it deliberately depends on nothing,
 * because it renders precisely when the things it would depend on are broken.
 *
 * Production hides the real message to avoid leaking internals, so the digest is
 * shown instead — it is the only handle that ties what the user saw to a line in
 * our logs, and it is the first thing support will ask for.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error.digest ?? "", error.message);
  }, [error]);

  return (
    <html lang="en" data-theme="light">
      {/* metadata exports aren't supported in a client error boundary. */}
      <title>Something went wrong · OKNexus</title>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0e14",
          color: "#e6e8ec",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#7c8394",
            }}
          >
            OKNexus
          </p>
          <h1 style={{ margin: "16px 0 0", fontSize: 26, fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.6, color: "#a2a8b6" }}>
            This one is on us, not you. Your account and balances are unaffected — nothing was
            changed by this error.
          </p>

          <div style={{ marginTop: 28, display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/* A hard navigation on purpose. next/link needs router context,
                which is part of what may have failed to get us here — a full
                page load is the one escape that cannot also be broken. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                border: "1px solid #2a2f3a",
                color: "#e6e8ec",
                borderRadius: 10,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Go home
            </a>
          </div>

          {error.digest && (
            <p style={{ marginTop: 24, fontSize: 12, color: "#7c8394" }}>
              Reference:{" "}
              <code style={{ fontFamily: "ui-monospace, monospace" }}>{error.digest}</code>
              <br />
              Quote this if you contact support.
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
