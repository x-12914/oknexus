import type { NextRequest } from "next/server";
import { sessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyTotp, decryptSecret } from "@/lib/totp";
import { notify } from "@/lib/notifications";

// Turn 2FA off — requires a valid current code, then clears the secret.
export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFAEnabled: true, twoFASecret: true },
  });
  if (!user?.twoFAEnabled || !user.twoFASecret) {
    return Response.json({ error: "Two-factor is not enabled." }, { status: 400 });
  }
  const secret = decryptSecret(user.twoFASecret);
  if (!secret || !verifyTotp(secret, String(code ?? ""))) {
    return Response.json({ error: "That code is incorrect." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFAEnabled: false, twoFASecret: null },
  });
  await notify(userId, {
    type: "SECURITY",
    title: "Two-factor authentication disabled",
    body: "2FA was turned off. If this wasn't you, re-enable it and change your password.",
    href: "/security",
  });
  return Response.json({ ok: true });
}
