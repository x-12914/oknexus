import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { emailConfigured } from "@/lib/email";
import { sendResetEmail } from "@/lib/password-reset";

const Schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
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
      try {
        await sendResetEmail({
          id: user.id,
          email: user.email,
          name: user.name,
          passwordHash: user.passwordHash,
        });
      } catch {
        // Swallow — don't leak delivery state to the caller.
      }
    }
  }

  return Response.json({ ok: true });
}
