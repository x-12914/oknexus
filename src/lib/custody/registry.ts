import { EvmAdapter } from "./evm";
import { SolanaAdapter } from "./solana";
import { BitcoinAdapter } from "./bitcoin";
import type { ChainAdapter, ChainConfig } from "./types";

// Which chains custody supports — EVM/Sepolia + Solana/devnet + Bitcoin/testnet,
// all behind the same ChainAdapter interface and the same shared HD seed.
export const EVM_CHAIN = process.env.EVM_CHAIN_NAME ?? "ethereum-sepolia";
export const SOL_CHAIN = process.env.SOL_CHAIN_NAME ?? "solana-devnet";
export const BTC_CHAIN = process.env.BTC_CHAIN_NAME ?? "bitcoin-testnet";
export const DEFAULT_CHAIN = EVM_CHAIN;
export const ALL_CHAINS = [EVM_CHAIN, SOL_CHAIN, BTC_CHAIN];

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
  if (chain.includes("solana")) return "Solana Devnet";
  if (chain.includes("bitcoin")) return "Bitcoin Testnet";
  return chain;
}
