import "server-only";
import { prisma } from "@/lib/db";
import { getChainAdapter, ALL_CHAINS } from "./registry";

/**
 * Reconcile custodied funds against the internal ledger.
 *
 * The ledger is the source of truth for what users own; the blockchain is the
 * source of truth for what we actually hold. Nothing forces those two numbers
 * to agree, and a credit bug quietly compounds until someone tries to withdraw
 * and can't. This is the check that catches it, and it is worth having in place
 * before real deposits arrive rather than after.
 *
 * It also produces the raw figures behind a Proof-of-Reserves claim: held
 * versus owed, per asset.
 */

export interface AssetReconciliation {
  chain: string;
  symbol: string;
  /** Sum of on-chain balances across every address we control on this chain. */
  heldOnChain: number;
  /** Sum of user balances in the ledger, available + locked. */
  owedToUsers: number;
  /** heldOnChain − owedToUsers. Negative means we are short. */
  difference: number;
  /** Held as a fraction of owed. 1 = fully backed; null when nothing is owed. */
  coverage: number | null;
  addressesChecked: number;
  /** True when we hold less than we owe — always worth an alert. */
  shortfall: boolean;
}

/**
 * Small tolerance for dust and rounding.
 *
 * Sweeps leave gas dust behind and floating point isn't exact, so an exact
 * equality check would cry wolf constantly and get ignored — which is worse
 * than no check at all.
 */
const TOLERANCE = 1e-8;

export async function reconcileChain(chain: string): Promise<AssetReconciliation[]> {
  const adapter = getChainAdapter(chain);
  const { nativeSymbol, tokens } = adapter.config;
  const symbols = [nativeSymbol, ...tokens.map((t) => t.symbol)];

  // Every address we control on this chain: per-user deposit addresses plus the
  // hot wallet. Funds sit in deposit addresses until a sweep moves them, so
  // both sides have to be counted or a mid-sweep snapshot looks like a loss.
  const deposits = await prisma.depositAddress.findMany({
    where: { chain },
    select: { address: true },
  });
  const addresses = new Set(deposits.map((d) => d.address));
  const hot = process.env.TURNKEY_EVM_HOT_ADDRESS;
  if (hot && chain.includes("ethereum")) addresses.add(hot);

  const out: AssetReconciliation[] = [];
  for (const symbol of symbols) {
    let heldOnChain = 0;
    for (const address of addresses) {
      heldOnChain += await adapter.getBalance(address, symbol);
    }

    const wallets = await prisma.wallet.findMany({
      where: { symbol },
      select: { balance: true, locked: true },
    });
    const owedToUsers = wallets.reduce((s, w) => s + Number(w.balance) + Number(w.locked), 0);

    const difference = heldOnChain - owedToUsers;
    out.push({
      chain,
      symbol,
      heldOnChain,
      owedToUsers,
      difference,
      coverage: owedToUsers > 0 ? heldOnChain / owedToUsers : null,
      addressesChecked: addresses.size,
      shortfall: difference < -TOLERANCE,
    });
  }
  return out;
}

export interface ReconcileResult {
  checked: number;
  shortfalls: AssetReconciliation[];
  assets: AssetReconciliation[];
}

/** One reconciliation pass across every enabled chain. */
export async function reconcileAll(): Promise<ReconcileResult> {
  const assets: AssetReconciliation[] = [];
  for (const chain of ALL_CHAINS) {
    try {
      assets.push(...(await reconcileChain(chain)));
    } catch {
      // One unreachable chain shouldn't stop the others being checked.
    }
  }
  const shortfalls = assets.filter((a) => a.shortfall);
  if (shortfalls.length > 0) {
    // Loud on purpose. Holding less than we owe is the single worst state this
    // system can be in, and it should never be discovered from a support ticket.
    for (const s of shortfalls) {
      console.error(
        `[reconcile] SHORTFALL ${s.chain}/${s.symbol}: hold ${s.heldOnChain}, owe ${s.owedToUsers}`,
      );
    }
  }
  return { checked: assets.length, shortfalls, assets };
}
