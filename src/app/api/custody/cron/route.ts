import type { NextRequest } from "next/server";
import { ALL_CHAINS } from "@/lib/custody/registry";
import { scanChain } from "@/lib/custody/scan";
import { sweepChain } from "@/lib/custody/sweep";
import { processWithdrawals } from "@/lib/custody/withdrawals";

// Driven by a system cron on the VPS (every ~minute) with a bearer secret.
// Runs one deposit-scan + withdrawal-processing pass per chain. Idempotent, and
// one chain's RPC failure never blocks the others.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.CUSTODY_MNEMONIC) {
    return Response.json({ ok: false, reason: "custody not configured" });
  }

  const chains: Record<string, unknown> = {};
  for (const chain of ALL_CHAINS) {
    try {
      const scan = await scanChain(chain);
      const sweep = await sweepChain(chain);
      const withdrawals = await processWithdrawals(chain);
      chains[chain] = { scan, sweep, withdrawals };
    } catch (e) {
      chains[chain] = { error: (e as Error).message };
    }
  }
  return Response.json({ ok: true, chains });
}
