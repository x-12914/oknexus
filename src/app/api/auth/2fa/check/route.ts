import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { clientIp } from "@/lib/login-history";
import { rateLimit } from "@/lib/rate-limit";

// A real bcrypt hash (computed once) so the "no such user" path costs the same as a
// genuine compare — equalises timing so this can't be used to enumerate accounts.
const DUMMY_HASH = bcrypt.hashSync("oknexus-timing-equalizer", 12);

// Pre-login probe: validates the password and reports whether a 2FA code is needed,
// so the login form can show the code step (NextAuth masks authorize() errors).
export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const { email, password } = await req.json().catch(() => ({}));
  const e = String(email ?? "").trim().toLowerCase();

  const rl = rateLimit(`pwcheck:${e}:${ip ?? "?"}`, {
    max: 8,
    windowMs: 900_000,
    lockoutMs: 900_000,
  });
  if (!rl.allowed) {
    return Response.json(
      { error: `Too many attempts. Try again in about ${Math.ceil(rl.retryAfterSec / 60)} min.` },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: e },
    select: { passwordHash: true, twoFAEnabled: true, suspended: true, emailVerified: true },
  });
  // Always run a bcrypt compare (real hash or dummy) so timing doesn't reveal whether
  // the account exists; only reveal suspension once the password is proven correct.
  const ok = await bcrypt.compare(String(password ?? ""), user?.passwordHash ?? DUMMY_HASH);
  if (!user?.passwordHash || !ok) return Response.json({ valid: false }, { status: 401 });
  if (user.suspended) {
    return Response.json({ error: "This account has been suspended." }, { status: 403 });
  }
  if (!user.emailVerified) {
    return Response.json({ valid: false, emailNotVerified: true }, { status: 403 });
  }

  return Response.json({ valid: true, needs2FA: user.twoFAEnabled });
}
