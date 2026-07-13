import { EvmAdapter } from "./evm";
import type { ChainAdapter, ChainConfig } from "./types";

// Single source of truth for which chains custody supports. EVM/Sepolia today;
// BTC testnet + SOL devnet slot in here behind the same ChainAdapter interface.
export const DEFAULT_CHAIN = process.env.EVM_CHAIN_NAME ?? "ethereum-sepolia";

let evm: EvmAdapter | undefined;

export function getChainAdapter(chain: string): ChainAdapter {
  if (chain === DEFAULT_CHAIN || chain === "ethereum-sepolia") {
    if (!evm) evm = new EvmAdapter();
    return evm;
  }
  throw new Error(`Unsupported chain: ${chain}`);
}

export function listChains(): ChainConfig[] {
  return [getChainAdapter(DEFAULT_CHAIN).config];
}
