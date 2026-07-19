import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { unstake, EarnError } from "@/lib/earn";

const Schema = z.object({ id: z.string().min(1) });

export async function POST(req: Request) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  try {
    return Response.json({ ok: true, ...(await unstake(userId, parsed.data.id)) });
  } catch (e) {
    if (e instanceof EarnError) return Response.json({ error: e.message }, { status: 400 });
    return Response.json({ error: "Could not unstake." }, { status: 500 });
  }
}
