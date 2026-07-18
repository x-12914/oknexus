import "server-only";
import crypto from "crypto";

// Per-purpose key derivation from the root AUTH_SECRET via HKDF, so a leak or oracle
// in one subsystem (reset tokens, email tokens, …) doesn't compromise the others or
// the NextAuth JWT secret. Fails closed — no insecure fallback secret.

function rootSecret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set — refusing to derive keys from a default.");
  return s;
}

/** A stable 32-byte key bound to `label` (e.g. "password-reset", "email-verify"). */
export function deriveKey(label: string): Buffer {
  return Buffer.from(crypto.hkdfSync("sha256", rootSecret(), Buffer.from("oknexus"), label, 32));
}
