import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { sendInternalTransfer, TransferError } from "@/lib/transfers";

const Schema = z.object({
  toEmail: z.string().email(),
  symbol: z.string().min(1).max(12),
  amount: z.number().positive().finite(),
  note: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in to continue." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid email, asset and amount." }, { status: 400 });
  }

  try {
    const result = await sendInternalTransfer(
      userId,
      parsed.data.toEmail,
      parsed.data.symbol.toUpperCase(),
      parsed.data.amount,
      parsed.data.note,
    );
    return Response.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof TransferError) return Response.json({ error: e.message }, { status: 400 });
    return Response.json({ error: "Transfer failed." }, { status: 500 });
  }
}
