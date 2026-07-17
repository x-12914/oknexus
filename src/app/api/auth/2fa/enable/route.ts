import type { NextRequest } from "next/server";
import { sessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyTotp, decryptSecret } from "@/lib/totp";
import { notify } from "@/lib/notifications";

// Confirm 2FA: verify a code against the pending secret, then flip it on.
export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFASecret: true },
  });
  if (!user?.twoFASecret) {
    return Response.json({ error: "Start 2FA setup first." }, { status: 400 });
  }
  const secret = decryptSecret(user.twoFASecret);
  if (!secret || !verifyTotp(secret, String(code ?? ""))) {
    return Response.json({ error: "That code is incorrect — try the current one." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data: { twoFAEnabled: true } });
  await notify(userId, {
    type: "SECURITY",
    title: "Two-factor authentication enabled",
    body: "2FA is now required at sign-in. Your account is more secure.",
    href: "/security",
  });
  return Response.json({ ok: true });
}
