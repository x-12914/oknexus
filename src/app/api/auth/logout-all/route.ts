import { sessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// "Sign out of all devices": bump tokenVersion so every existing JWT (including
// this one) fails the per-request check in auth.ts and is forced to re-login.
export async function POST() {
  const u = await sessionUser();
  if (!u) return Response.json({ error: "Not signed in." }, { status: 401 });

  await prisma.user.update({
    where: { id: u.id },
    data: { tokenVersion: { increment: 1 } },
  });
  return Response.json({ ok: true });
}
