import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { readEmailToken, appUrl } from "@/lib/email-verify";

// Clicked from the verification email. Validates the signed token, marks the
// user's email verified, and redirects to a friendly result page.
export async function GET(req: NextRequest) {
  const to = (status: string) => Response.redirect(`${appUrl()}/verify-email?status=${status}`, 302);

  const userId = readEmailToken(req.nextUrl.searchParams.get("token") ?? "");
  if (!userId) return to("invalid");

  try {
    await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
  } catch {
    return to("invalid");
  }
  return to("success");
}
