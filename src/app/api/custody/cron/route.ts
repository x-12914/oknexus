import type { NextRequest } from "next/server";
import { ALL_CHAINS } from "@/lib/custody/registry";
import { scanChain } from "@/lib/custody/scan";
import { sweepChain } from "@/lib/custody/sweep";
import { processWithdrawals } from "@/lib/custody/withdrawals";
import { reconcileAll } from "@/lib/custody/reconcile";
import { processStopTriggers } from "@/lib/orders";
import { processPriceAlerts } from "@/lib/price-alerts";
import { accrueStakes } from "@/lib/earn";
import { reconcilePayouts, checkPayoutFloat } from "@/lib/ramp/payouts";
import { turnkeyConfigured } from "@/lib/turnkey";
import { monitor } from "@/lib/monitoring";

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
  // Drives in-flight fiat payouts to a terminal state. Runs here rather than
  // under the custody gate below: it needs the payout provider, not a chain.
  const payouts = await reconcilePayouts().catch((e) => ({ error: (e as Error).message }));
  const float = await checkPayoutFloat().catch((e) => ({ error: (e as Error).message }));

  // Deposit scanning works under either custody backend Turnkey (addresses only)
  // or the HD seed. Only skip when neither is configured.
  if (!turnkeyConfigured() && !process.env.CUSTODY_MNEMONIC) {
    const health = await monitor().catch((e) => ({ error: (e as Error).message }));
    return Response.json({
      ok: true, stops, alerts, staking, payouts, float, health,
      reason: "custody not configured",
    });
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
  // Held-vs-owed across every enabled chain. Reported every pass so a shortfall
  // shows up in monitoring rather than in a support ticket.
  const reconcile = await reconcileAll().catch((e) => ({ error: (e as Error).message }));

  // Health checks last, so they observe the state this pass just produced. Given
  // the reconciliation we already ran rather than repeating every on-chain read.
  const health = await monitor(
    "shortfalls" in reconcile ? { reconcile } : {},
  ).catch((e) => ({ error: (e as Error).message }));

  return Response.json({ ok: true, stops, alerts, staking, payouts, float, reconcile, health, chains });
}
