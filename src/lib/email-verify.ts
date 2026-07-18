import "server-only";
import crypto from "crypto";
import { sendEmail } from "./email";
import { deriveKey } from "@/lib/keys";

// Stateless email-verification tokens: an HMAC over `userId:expiry` signed with
// AUTH_SECRET, so no token table is needed. Valid for 24 hours.
const TTL_MS = 1000 * 60 * 60 * 24;

function sign(payload: string): string {
  return crypto.createHmac("sha256", deriveKey("email-verify")).update(payload).digest("base64url");
}

export function appUrl(): string {
  return (process.env.AUTH_URL ?? process.env.APP_URL ?? "https://oknexusexchange.com").replace(
    /\/$/,
    "",
  );
}

export function makeEmailToken(userId: string): string {
  const payload = `${userId}:${Date.now() + TTL_MS}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

export function readEmailToken(token: string): string | null {
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const p = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let payload: string;
  try {
    payload = Buffer.from(p, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [userId, expStr] = payload.split(":");
  const exp = Number(expStr);
  if (!userId || !Number.isFinite(exp) || Date.now() > exp) return null;
  return userId;
}

export async function sendVerificationEmail(user: {
  id: string;
  email: string;
  name: string | null;
}): Promise<void> {
  const link = `${appUrl()}/api/auth/verify-email?token=${encodeURIComponent(makeEmailToken(user.id))}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your OKNexus email",
    html: verificationHtml(user.name?.trim() || "there", link),
  });
}

function verificationHtml(name: string, link: string): string {
  return `
  <div style="background:#08060f;padding:32px 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#100d1c;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
      <div style="padding:28px 32px;">
        <div style="font-size:20px;font-weight:700;letter-spacing:0.5px;">
          <span style="color:#f7a91b;">OK</span><span style="color:#ffffff;">NEXUS</span>
        </div>
        <h1 style="color:#ffffff;font-size:22px;margin:24px 0 8px;">Confirm your email</h1>
        <p style="color:#a7a4b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Hi ${name}, welcome to OKNexus. Tap the button below to verify your email address and secure your account.
        </p>
        <a href="${link}" style="display:inline-block;background:#ffffff;color:#0b0a12;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:999px;">
          Verify email
        </a>
        <p style="color:#6f6c80;font-size:12px;line-height:1.6;margin:24px 0 0;">
          This link expires in 24 hours. If you didn't create an OKNexus account, you can ignore this email.
        </p>
        <p style="color:#4a4857;font-size:11px;word-break:break-all;margin:16px 0 0;">${link}</p>
      </div>
    </div>
  </div>`;
}
