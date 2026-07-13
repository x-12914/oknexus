import type { NextRequest } from "next/server";
import { DEFAULT_CHAIN } from "@/lib/custody/registry";
import { scanChain } from "@/lib/custody/scan";
import { processWithdrawals } from "@/lib/custody/withdrawals";

// Driven by a system cron on the VPS (every ~minute) with a bearer secret.
// Runs one deposit-scan + withdrawal-processing pass. Kept idempotent so a
// missed or doubled tick is harmless.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.CUSTODY_MNEMONIC || !process.env.EVM_RPC_URL) {
    return Response.json({ ok: false, reason: "custody not configured" });
  }

  try {
    const scan = await scanChain(DEFAULT_CHAIN);
    const withdrawals = await processWithdrawals(DEFAULT_CHAIN);
    return Response.json({ ok: true, chain: DEFAULT_CHAIN, scan, withdrawals });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
