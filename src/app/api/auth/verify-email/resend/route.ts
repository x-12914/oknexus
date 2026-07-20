import { sessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { emailConfigured } from "@/lib/email";
import { sendVerificationEmail } from "@/lib/email-verify";

// Re-send the email-verification link to the signed-in user (if still unverified).
export async function POST() {
  const u = await sessionUser();
  if (!u) return Response.json({ error: "Not signed in." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: u.id },
    select: { id: true, email: true, name: true, emailVerified: true },
  });
  if (!user) return Response.json({ error: "Account not found." }, { status: 404 });
  if (user.emailVerified) return Response.json({ ok: true, alreadyVerified: true });

  if (!emailConfigured()) {
    return Response.json({ error: "Email delivery is not configured yet." }, { status: 503 });
  }
  try {
    await sendVerificationEmail({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    console.error("Resend API Error:", err);
    return Response.json({ error: "Could not send the email right now." }, { status: 502 });
  }
  return Response.json({ ok: true });
}
