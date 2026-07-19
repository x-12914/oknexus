import "server-only";
import { prisma } from "@/lib/db";

/** Record a successful sign-in. Best-effort — never blocks or fails the login. */
export async function recordLogin(
  userId: string,
  ip: string | null,
  userAgent: string | null,
): Promise<void> {
  try {
    await prisma.loginEvent.create({
      data: {
        userId,
        ip: ip ? ip.slice(0, 64) : null,
        userAgent: userAgent ? userAgent.slice(0, 256) : null,
      },
    });
  } catch {
    // Login history is non-critical; swallow so logging can never block sign-in.
  }
}

/** Client IP from proxy headers (nginx sets X-Forwarded-For / X-Real-IP). */
export function clientIp(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return headers.get("x-real-ip");
}

/** Turn a raw User-Agent into a short "Browser · OS" label for display. */
export function describeDevice(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser = /\bEdg\//.test(ua)
    ? "Edge"
    : /\bOPR\/|\bOpera\b/.test(ua)
      ? "Opera"
      : /\bChrome\//.test(ua)
        ? "Chrome"
        : /\bFirefox\//.test(ua)
          ? "Firefox"
          : /\bSafari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Macintosh|Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iPod/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} · ${os}` : browser;
}
