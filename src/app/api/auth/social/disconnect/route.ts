import type { NextRequest } from "next/server";
import { sessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clientIp } from "@/lib/login-history";
import { notify } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import { socialProviderLabel } from "@/lib/social-auth";

/** Unlink a social provider from the signed-in account. */
export async function POST(req: NextRequest) {
  const u = await sessionUser();
  if (!u) return Response.json({ error: "Please sign in." }, { status: 401 });

  if (!rateLimit(`social-disconnect:${u.id}:${clientIp(req.headers) ?? "?"}`, {
    max: 10,
    windowMs: 900_000,
    lockoutMs: 900_000,
  }).allowed) {
    return Response.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  let provider: string;
  try {
    provider = String(((await req.json()) as { provider?: unknown }).provider ?? "");
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!provider) return Response.json({ error: "Invalid request." }, { status: 400 });

  const [user, accounts] = await Promise.all([
    prisma.user.findUnique({ where: { id: u.id }, select: { passwordHash: true } }),
    prisma.account.findMany({ where: { userId: u.id }, select: { provider: true } }),
  ]);
  if (!user) return Response.json({ error: "Account not found." }, { status: 404 });

  if (!accounts.some((a) => a.provider === provider)) {
    return Response.json({ error: "That provider isn't connected." }, { status: 404 });
  }

  // Never leave an account with no way back in.
  if (!user.passwordHash && accounts.length <= 1) {
    return Response.json(
      {
        error:
          "This is your only way to sign in. Set a password from Password Management before disconnecting it.",
      },
      { status: 400 },
    );
  }

  await prisma.account.deleteMany({ where: { userId: u.id, provider } });

  await notify(u.id, {
    type: "SECURITY",
    title: "Social login disconnected",
    body: `${socialProviderLabel(provider)} can no longer be used to sign in to your account.`,
    href: "/settings/security",
  });

  return Response.json({ ok: true });
}
