import type { NextRequest } from "next/server";
import { sessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendPasswordOtpEmail } from "@/lib/email-verify";
import { clientIp } from "@/lib/login-history";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const u = await sessionUser();
  if (!u) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit OTP generation
  if (
    !rateLimit(`pwd-otp:${clientIp(req.headers) ?? "?"}`, {
      max: 5,
      windowMs: 900_000,
      lockoutMs: 900_000,
    }).allowed
  ) {
    return Response.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: u.id },
    select: { email: true, name: true },
  });

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  try {
    await sendPasswordOtpEmail(user.email, user.name);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Failed to send password OTP", error);
    return Response.json({ error: "Could not send email." }, { status: 500 });
  }
}
