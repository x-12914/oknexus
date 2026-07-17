import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Pre-login probe: validates the password and reports whether a 2FA code is needed,
// so the login form can show the code step (NextAuth masks authorize() errors).
export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  const e = String(email ?? "").trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: e },
    select: { passwordHash: true, twoFAEnabled: true, suspended: true },
  });
  if (!user?.passwordHash) return Response.json({ valid: false }, { status: 401 });
  if (user.suspended) {
    return Response.json({ error: "This account has been suspended." }, { status: 403 });
  }
  const ok = await bcrypt.compare(String(password ?? ""), user.passwordHash);
  if (!ok) return Response.json({ valid: false }, { status: 401 });

  return Response.json({ valid: true, needs2FA: user.twoFAEnabled });
}
