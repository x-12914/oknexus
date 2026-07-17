import { prisma } from "@/lib/db";
import { turnkeyConfigured } from "@/lib/turnkey";
import { getChainAdapter, EVM_CHAIN } from "./registry";
import { EvmAdapter } from "./evm";

export interface SweepResult {
  candidates: number;
  swept: number;
}

/**
 * Consolidate funds from per-user Turnkey deposit addresses into the hot wallet so
 * it can fund withdrawals. Treasury-only: the deposits were already credited to the
 * ledger when detected, so sweeping never touches user balances. EVM native-ETH only
 * for now (ERC-20 sweeping needs gas-funding, a follow-up). Only addresses that have
 * actually received deposits are checked, and the per-address balance threshold means
 * already-swept addresses are skipped on the next pass.
 */
export async function sweepChain(chain: string): Promise<SweepResult> {
  const result: SweepResult = { candidates: 0, swept: 0 };
  if (!turnkeyConfigured() || chain !== EVM_CHAIN) return result;

  const adapter = getChainAdapter(chain);
  if (!(adapter instanceof EvmAdapter)) return result;

  const rows = await prisma.deposit.findMany({
    where: { chain },
    select: { address: true },
    distinct: ["address"],
    take: 200,
  });
  result.candidates = rows.length;

  for (const { address } of rows) {
    try {
      const swept = await adapter.sweepNativeToHot(address as `0x${string}`);
      if (swept) result.swept++;
    } catch {
      // One address's failure shouldn't stop the sweep.
    }
  }
  return result;
}
