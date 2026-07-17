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

export function totpQrDataUri(keyUri: string): Promise<string> {
  return QRCode.toDataURL(keyUri, { margin: 1, width: 220 });
}

// --- Encrypt the TOTP secret at rest (AES-256-GCM, key derived from AUTH_SECRET) ---
function encKey(): Buffer {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "insecure-dev-secret";
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
