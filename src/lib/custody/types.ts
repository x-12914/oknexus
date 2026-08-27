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
  /** True for test networks. Drives the deposit-screen warning, so it must be explicit. */
  testnet: boolean;
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
  /**
   * Live network cost of sending `symbol`, denominated in `symbol`.
   *
   * A BTC transaction priced in sat/vB and an ERC-20 transfer priced in gas
   * have nothing in common, so each adapter measures its own chain rather than
   * a shared table guessing on their behalf. Should fall back to a sane
   * estimate rather than throwing — a fee lookup must not break the page.
   */
  estimateNetworkFee(symbol: string): Promise<number>;
  /**
   * On-chain balance of `address` for `symbol`, in whole units.
   *
   * Needed to reconcile what we actually custody against what the ledger says
   * we owe. Returns 0 rather than throwing when the address or asset can't be
   * read — a reconciliation pass should report a gap, not crash.
   */
  getBalance(address: string, symbol: string): Promise<number>;
  /** Whether `address` is a valid destination on this chain. */
  validateAddress(address: string): boolean;
  /** Mined status of a broadcast tx, used to confirm withdrawals. */
  getTransaction(txHash: string): Promise<{ mined: boolean; blockNumber: bigint; success: boolean }>;
}
