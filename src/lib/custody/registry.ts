import { EvmAdapter } from "./evm";
import { SolanaAdapter } from "./solana";
import { BitcoinAdapter } from "./bitcoin";
import type { ChainAdapter, ChainConfig } from "./types";

// Which chains custody supports, all behind the same ChainAdapter interface.
export const EVM_CHAIN = process.env.EVM_CHAIN_NAME ?? "ethereum-sepolia";
export const SOL_CHAIN = process.env.SOL_CHAIN_NAME ?? "solana-devnet";
export const BTC_CHAIN = process.env.BTC_CHAIN_NAME ?? "bitcoin-testnet";
export const DEFAULT_CHAIN = EVM_CHAIN;

/**
 * Chains actually offered to users, as a comma-separated list of "evm", "sol"
 * and "btc". Defaults to EVM only.
 *
 * This is explicit because Solana and Bitcoin have no mainnet toggle: their
 * adapters are pinned to devnet and testnet. Offering them alongside a
 * mainnet Ethereum would be a fund-loss trap — a Solana address is the same
 * string on devnet and mainnet, so a user sending real SOL would have it land
 * on a key we control but a network we never scan, and it would simply never
 * be credited. Only enable a chain here once it is genuinely on mainnet.
 */
function enabledChains(): string[] {
  const raw = (process.env.CUSTODY_CHAINS ?? "evm").toLowerCase();
  const want = new Set(raw.split(",").map((c) => c.trim()).filter(Boolean));
  const out: string[] = [];
  if (want.has("evm")) out.push(EVM_CHAIN);
  if (want.has("sol")) out.push(SOL_CHAIN);
  if (want.has("btc")) out.push(BTC_CHAIN);
  return out.length ? out : [EVM_CHAIN];
}

export const ALL_CHAINS = enabledChains();

const cache = new Map<string, ChainAdapter>();

function build(chain: string): ChainAdapter {
  if (chain === EVM_CHAIN || chain === "ethereum-sepolia") return new EvmAdapter();
  if (chain === SOL_CHAIN || chain === "solana-devnet") return new SolanaAdapter();
  if (chain === BTC_CHAIN || chain === "bitcoin-testnet") return new BitcoinAdapter();
  throw new Error(`Unsupported chain: ${chain}`);
}

export function getChainAdapter(chain: string): ChainAdapter {
  let a = cache.get(chain);
  if (!a) {
    a = build(chain);
    cache.set(chain, a);
  }
  return a;
}

export function listChains(): ChainConfig[] {
  return ALL_CHAINS.map((c) => getChainAdapter(c).config);
}

export function chainLabel(chain: string): string {
  if (chain.includes("sepolia")) return "Ethereum Sepolia";
  if (chain.includes("ethereum")) return "Ethereum";
  if (chain.includes("devnet")) return "Solana Devnet";
  if (chain.includes("solana")) return "Solana";
  if (chain.includes("testnet")) return "Bitcoin Testnet";
  if (chain.includes("bitcoin")) return "Bitcoin";
  return chain;
}
