import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";

/**
 * Two-factor hand-off for social sign-in.
 *
 * A social provider proves *possession of an inbox*, not the second factor the
 * user enabled on their exchange account. So when an account has 2FA on, the
 * OAuth callback stops short of minting a session: it drops this short-lived,
 * HMAC-signed challenge and redirects to /login/2fa, where the `oauth-2fa`
 * credentials provider finishes the sign-in once a valid TOTP code is entered.
 *
 * The cookie is worthless on its own — it names a user but grants nothing until
 * it is presented together with a current authenticator code.
 */

const COOKIE_NAME = "oknexus.oauth-2fa";
const TTL_MS = 5 * 60_000;

export interface TwoFactorChallenge {
  userId: string;
  /** Auth.js provider id, e.g. "google". */
  provider: string;
  /** The provider's account type ("oauth" | "oidc"), stored so the Account row matches. */
  accountType: string;
  /** The provider's own id for this account — linked once the code checks out. */
  providerAccountId: string;
  expiresAt: number;
}

function signingSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", signingSecret()).update(payload).digest("hex");
}

function encode(challenge: TwoFactorChallenge): string {
  // Base64url the payload: Apple's `sub` contains dots, so no delimiter-splitting.
  const payload = Buffer.from(JSON.stringify(challenge)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(raw: string | null | undefined): TwoFactorChallenge | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);

  const expected = sign(payload);
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as TwoFactorChallenge;
    if (!parsed?.userId || !parsed.provider || !parsed.providerAccountId) return null;
    if (!Number.isFinite(parsed.expiresAt) || parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Issue the challenge. Only callable from a route handler (it writes a cookie). */
export async function issueTwoFactorChallenge(
  challenge: Omit<TwoFactorChallenge, "expiresAt">,
): Promise<void> {
  const full: TwoFactorChallenge = { ...challenge, expiresAt: Date.now() + TTL_MS };
  const store = await cookies();
  store.set(COOKIE_NAME, encode(full), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(TTL_MS / 1000),
  });
}

/** Read the pending challenge from the request's cookies. */
export async function readTwoFactorChallenge(): Promise<TwoFactorChallenge | null> {
  const store = await cookies();
  return decode(store.get(COOKIE_NAME)?.value);
}

/**
 * Read it straight off a raw Cookie header — `authorize()` is handed a Request
 * rather than running inside the `next/headers` async context.
 */
export function readTwoFactorChallengeFromHeader(
  header: string | null | undefined,
): TwoFactorChallenge | null {
  if (!header) return null;
  for (const pair of header.split(";")) {
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    if (pair.slice(0, eq).trim() !== COOKIE_NAME) continue;
    return decode(decodeURIComponent(pair.slice(eq + 1).trim()));
  }
  return null;
}

export async function clearTwoFactorChallenge(): Promise<void> {
  try {
    (await cookies()).delete(COOKIE_NAME);
  } catch {
    // Called from a context that can't write cookies — the 5-minute TTL and the
    // single-use TOTP code still close the window.
  }
}
