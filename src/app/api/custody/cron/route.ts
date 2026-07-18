import type { NextRequest } from "next/server";
import { ALL_CHAINS } from "@/lib/custody/registry";
import { scanChain } from "@/lib/custody/scan";
import { sweepChain } from "@/lib/custody/sweep";
import { processWithdrawals } from "@/lib/custody/withdrawals";
import { processStopTriggers } from "@/lib/orders";
import { processPriceAlerts } from "@/lib/price-alerts";
import { accrueStakes } from "@/lib/earn";

// Driven by a system cron on the VPS (every ~minute) with a bearer secret.
// Runs one deposit-scan + withdrawal-processing pass per chain. Idempotent, and
// one chain's RPC failure never blocks the others.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Stop-order triggers + price alerts run regardless of custody config (prices only).
  const stops = await processStopTriggers().catch((e) => ({ error: (e as Error).message }));
  const alerts = await processPriceAlerts().catch((e) => ({ error: (e as Error).message }));
  const staking = await accrueStakes().catch((e) => ({ error: (e as Error).message }));

  if (!process.env.CUSTODY_MNEMONIC) {
    return Response.json({ ok: true, stops, alerts, staking, reason: "custody not configured" });
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
  return Response.json({ ok: true, stops, alerts, staking, chains });
}
