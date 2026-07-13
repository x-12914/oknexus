import type { NextRequest } from "next/server";
import { z } from "zod";
import { sessionUserId } from "@/lib/auth";
import { DEFAULT_CHAIN } from "@/lib/custody/registry";
import { requestWithdrawal } from "@/lib/custody/withdrawals";

const Schema = z.object({
  symbol: z.string().min(1),
  amount: z.number().positive(),
  toAddress: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in to withdraw." }, { status: 401 });
  if (!process.env.CUSTODY_MNEMONIC || !process.env.EVM_RPC_URL) {
    return Response.json({ error: "Custody is not configured yet." }, { status: 503 });
  }
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  try {
    const w = await requestWithdrawal(
      userId,
      DEFAULT_CHAIN,
      parsed.data.symbol,
      parsed.data.amount,
      parsed.data.toAddress,
    );
    return Response.json({ id: w.id, status: w.status });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "INSUFFICIENT_BALANCE") {
      return Response.json(
        { error: "Insufficient balance to withdraw that amount." },
        { status: 400 },
      );
    }
    return Response.json({ error: msg }, { status: 400 });
  }
}
