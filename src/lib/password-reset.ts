import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "./email";
import { appUrl } from "./email-verify";

// Stateless, single-use password-reset tokens. The HMAC is taken over
// `userId:passwordHash:expiry`, so the moment the password changes the old token
// stops validating — no token table needed. Valid for 30 minutes.
const TTL_MS = 1000 * 60 * 30;

function secret(): string {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "insecure-dev-secret";
}

function sign(userId: string, passwordHash: string, exp: number): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${userId}:${passwordHash}:${exp}`)
    .digest("base64url");
}

export function makeResetToken(userId: string, passwordHash: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = Buffer.from(`${userId}:${exp}`).toString("base64url");
  return `${payload}.${sign(userId, passwordHash, exp)}`;
}

/** Validate a reset token against the user's *current* password hash; returns the userId. */
export async function readResetToken(token: string): Promise<string | null> {
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  let payload: string;
  try {
    payload = Buffer.from(token.slice(0, dot), "base64url").toString("utf8");
  } catch {
    return null;
  }
  const sig = token.slice(dot + 1);
  const [userId, expStr] = payload.split(":");
  const exp = Number(expStr);
  if (!userId || !Number.isFinite(exp) || Date.now() > exp) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) return null;

  const expected = sign(userId, user.passwordHash, exp);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return userId;
}

export async function sendResetEmail(user: {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
}): Promise<void> {
  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(
    makeResetToken(user.id, user.passwordHash),
  )}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your OKNexus password",
    html: resetHtml(user.name?.trim() || "there", link),
  });
}

function resetHtml(name: string, link: string): string {
  return `
  <div style="background:#08060f;padding:32px 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#100d1c;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
      <div style="padding:28px 32px;">
        <div style="font-size:20px;font-weight:700;letter-spacing:0.5px;">
          <span style="color:#f7a91b;">OK</span><span style="color:#ffffff;">NEXUS</span>
        </div>
        <h1 style="color:#ffffff;font-size:22px;margin:24px 0 8px;">Reset your password</h1>
        <p style="color:#a7a4b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
          Hi ${name}, we received a request to reset your OKNexus password. Tap the button below to choose a new one.
        </p>
        <a href="${link}" style="display:inline-block;background:#ffffff;color:#0b0a12;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:999px;">
          Reset password
        </a>
        <p style="color:#6f6c80;font-size:12px;line-height:1.6;margin:24px 0 0;">
          This link expires in 30 minutes. If you didn't request a reset, you can safely ignore this email — your password won't change.
        </p>
        <p style="color:#4a4857;font-size:11px;word-break:break-all;margin:16px 0 0;">${link}</p>
      </div>
    </div>
  </div>`;
}
