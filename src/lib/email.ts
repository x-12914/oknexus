import "server-only";
import { Resend } from "resend";

/**
 * Transactional email via Resend (server-only). Requires RESEND_API_KEY and a
 * verified sender domain set in EMAIL_FROM (e.g. "OKNexus <no-reply@oknexusexchange.com>").
 * Until the domain is verified in Resend, use their test sender "onboarding@resend.dev"
 * (which only delivers to the account owner's address).
 */
const FROM = process.env.EMAIL_FROM ?? "OKNexus <onboarding@resend.dev>";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Resend is not configured — set RESEND_API_KEY.");
  const { error } = await new Resend(key).emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
}
