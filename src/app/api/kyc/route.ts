import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { getKyc, submitKyc } from "@/lib/kyc";

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  return Response.json(await getKyc(userId));
}

const Schema = z.object({
  legalName: z.string().min(1).max(120),
  country: z.string().min(1).max(60),
  idNumber: z.string().min(1).max(60),
});

export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "All fields are required." }, { status: 400 });
  try {
    await submitKyc(userId, parsed.data);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
