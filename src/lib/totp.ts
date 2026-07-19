import "server-only";
import crypto from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";

const ISSUER = "OKNexus";

// Allow ±1 time-step (±30s) for authenticator clock drift.
authenticator.options = { window: 1 };

export function newTotpSecret(): string {
  return authenticator.generateSecret();
}

export function totpKeyUri(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret);
}

export function verifyTotp(secret: string, code: string): boolean {
  const token = String(code ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) return false;
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

// --- Single-use guard: reject replay of a TOTP code within its validity window ---
const usedCodes = new Map<string, number>(); // `${userId}:${code}` -> expiry ms
let lastUsedSweep = 0;

/** Verify a code AND ensure it hasn't already been used for this user (anti-replay). */
export function verifyTotpOnce(userId: string, secret: string, code: string): boolean {
  if (!verifyTotp(secret, code)) return false;
  const now = Date.now();
  if (now - lastUsedSweep > 120_000) {
    lastUsedSweep = now;
    for (const [k, exp] of usedCodes) if (exp < now) usedCodes.delete(k);
  }
  const key = `${userId}:${String(code).replace(/\s+/g, "")}`;
  if ((usedCodes.get(key) ?? 0) > now) return false; // already consumed within the window
  usedCodes.set(key, now + 90_000);
  return true;
}

export function totpQrDataUri(keyUri: string): Promise<string> {
  return QRCode.toDataURL(keyUri, { margin: 1, width: 220 });
}

// --- Encrypt the TOTP secret at rest (AES-256-GCM, key derived from AUTH_SECRET) ---
function encKey(): Buffer {
  // Keep the sha256(AUTH_SECRET) derivation (changing it would orphan existing
  // encrypted secrets) but fail closed rather than fall back to a known default.
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return crypto.createHash("sha256").update(s).digest();
}

export function encryptSecret(secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey(), iv);
  const enc = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptSecret(payload: string): string | null {
  try {
    const [ivB, tagB, dataB] = payload.split(".");
    const decipher = crypto.createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivB, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(dataB, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
