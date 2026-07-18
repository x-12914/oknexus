import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { emailConfigured } from "@/lib/email";
import { sendResetEmail } from "@/lib/password-reset";
import { clientIp } from "@/lib/login-history";
import { rateLimit } from "@/lib/rate-limit";

const Schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  // Throttle per IP; stay generic (200) even when throttled so nothing leaks.
  if (
    !rateLimit(`forgot:${clientIp(req.headers) ?? "?"}`, {
      max: 6,
      windowMs: 900_000,
      lockoutMs: 900_000,
    }).allowed
  ) {
    return Response.json({ ok: true });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  // Always answer identically — never reveal whether an account exists.
  if (parsed.success) {
    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.passwordHash && emailConfigured()) {
      // Fire-and-forget so response time doesn't reveal whether the account exists.
      void sendResetEmail({
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
      }).catch(() => {});
    }
  }

  return Response.json({ ok: true });
}
