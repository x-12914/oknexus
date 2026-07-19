import { sessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { newTotpSecret, totpKeyUri, totpQrDataUri, encryptSecret } from "@/lib/totp";

// Begin 2FA setup: generate a secret + QR. Stored (encrypted) as pending — 2FA is
// only actually enabled once the user confirms a code at /api/auth/2fa/enable.
export async function POST() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, twoFAEnabled: true },
  });
  if (!user) return Response.json({ error: "Account not found." }, { status: 404 });
  if (user.twoFAEnabled) {
    return Response.json({ error: "Two-factor is already enabled." }, { status: 400 });
  }

  const secret = newTotpSecret();
  const keyUri = totpKeyUri(user.email, secret);
  const qr = await totpQrDataUri(keyUri);

  await prisma.user.update({ where: { id: userId }, data: { twoFASecret: encryptSecret(secret) } });

  return Response.json({ qr, secret, otpauth: keyUri });
}
