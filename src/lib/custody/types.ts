// Chain-agnostic custody interface. EVM today; BTC/SOL implement the same shape.
// Mirrors the ExchangeConnector pattern: one interface, per-chain implementations.

export type ChainKind = "EVM" | "BTC" | "SOL";

export interface TokenConfig {
  symbol: string; // "USDT"
  address: string; // ERC-20 contract
  decimals: number;
}

export interface ChainConfig {
  chain: string; // "ethereum-sepolia"
  kind: ChainKind;
  nativeSymbol: string; // "ETH"
  minConfirmations: number;
  explorerTxUrl: (hash: string) => string;
  explorerAddressUrl: (addr: string) => string;
  tokens: TokenConfig[];
}

export interface OnChainDeposit {
  symbol: string;
  amount: number;
  address: string; // our deposit address that received the funds
  txHash: string;
  blockNumber: bigint;
}

export interface ChainAdapter {
  readonly config: ChainConfig;
  /** Derive the deposit address at HD index `i` from the custody seed. */
  deriveAddress(index: number): string;
  /** Current chain tip. */
  getBlockNumber(): Promise<bigint>;
  /** Find native + token transfers to any `watched` address in [fromBlock, toBlock]. */
  scanDeposits(watched: string[], fromBlock: bigint, toBlock: bigint): Promise<OnChainDeposit[]>;
  /** Sign & broadcast a withdrawal from the hot wallet; returns the tx hash. */
  sendWithdrawal(symbol: string, to: string, amount: number): Promise<string>;
  /** Whether `address` is a valid destination on this chain. */
  validateAddress(address: string): boolean;
  /** Mined status of a broadcast tx, used to confirm withdrawals. */
  getTransaction(txHash: string): Promise<{ mined: boolean; blockNumber: bigint; success: boolean }>;
}
