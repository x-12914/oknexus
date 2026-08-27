import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import {
  listWhitelist,
  addWhitelistAddress,
  removeWhitelistAddress,
  setWhitelistOnly,
  WhitelistError,
} from "@/lib/custody/whitelist";

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ enabled: false, addresses: [] });
  const [user, addresses] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { whitelistOnly: true } }),
    listWhitelist(userId),
  ]);
  return Response.json({ enabled: !!user?.whitelistOnly, addresses });
}

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    chain: z.string().min(2),
    address: z.string().min(6).max(120),
    label: z.string().max(60).optional(),
  }),
  z.object({ action: z.literal("remove"), id: z.string().min(3) }),
  z.object({ action: z.literal("setEnabled"), value: z.boolean() }),
]);

export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });

  // These change a security control, so they're rate-limited like the 2FA ones.
  if (!rateLimit(`whitelist:${userId}`, { max: 20, windowMs: 600_000 }).allowed) {
    return Response.json({ error: "Too many changes. Try again later." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const d = parsed.data;

  try {
    if (d.action === "add") {
      return Response.json(
        await addWhitelistAddress(userId, d.chain, d.address, d.label ?? "Saved address"),
      );
    }
    if (d.action === "remove") {
      await removeWhitelistAddress(userId, d.id);
      return Response.json({ ok: true });
    }
    await setWhitelistOnly(userId, d.value);
    return Response.json({ ok: true });
  } catch (e) {
    const status = e instanceof WhitelistError ? 400 : 500;
    return Response.json({ error: (e as Error).message }, { status });
  }
}
