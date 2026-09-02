import { prisma } from "@/lib/db";
import { turnkeyConfigured } from "@/lib/turnkey";
import { getChainAdapter, EVM_CHAIN } from "./registry";
import { EvmAdapter, HotWalletEmptyError } from "./evm";

export interface SweepResult {
  candidates: number;
  /** Native-ETH sweeps completed this pass. */
  swept: number;
  /** ERC-20 sweeps completed this pass. */
  tokensSwept: number;
  /** Addresses given gas this pass; their tokens move next pass. */
  gasFunded: number;
  /** Set when the hot wallet could not cover a top-up. Token sweeping stopped. */
  hotWalletEmpty?: string;
}

/**
 * Consolidate funds from per-user Turnkey deposit addresses into the hot wallet so
 * it can fund withdrawals. Treasury-only: the deposits were already credited to the
 * ledger when detected, so sweeping never touches user balances.
 *
 * Native ETH sweeps pay their own gas out of the balance being moved. Tokens
 * cannot — an address that only ever received USDT has no ETH — so those run as
 * a two-pass machine: fund the gas from the hot wallet on one pass, move the
 * token on the next. See EvmAdapter.sweepTokenToHot.
 *
 * Only addresses that have actually received a deposit are checked, and each
 * adapter's own threshold means an already-swept address costs one balance read
 * and nothing more.
 */
export async function sweepChain(chain: string): Promise<SweepResult> {
  const result: SweepResult = { candidates: 0, swept: 0, tokensSwept: 0, gasFunded: 0 };
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

  // Once the hot wallet is known to be empty there is no point asking it to fund
  // the next hundred addresses; every attempt would fail the same way.
  let hotWalletEmpty = false;

  for (const { address } of rows) {
    const from = address as `0x${string}`;
    try {
      const swept = await adapter.sweepNativeToHot(from);
      if (swept) result.swept++;
    } catch {
      // One address's failure shouldn't stop the sweep.
    }

    if (hotWalletEmpty) continue;
    for (const token of adapter.config.tokens) {
      try {
        const outcome = await adapter.sweepTokenToHot(from, token);
        if (outcome?.kind === "swept") result.tokensSwept++;
        else if (outcome?.kind === "funded") result.gasFunded++;
      } catch (e) {
        if (e instanceof HotWalletEmptyError) {
          hotWalletEmpty = true;
          result.hotWalletEmpty = e.message;
          break;
        }
        // Any other failure is this address's alone.
      }
    }
  }
  return result;
}
