// Client-safe custody types (no server imports).

export interface ChainInfo {
  chain: string; // "ethereum-sepolia"
  label: string; // "Ethereum Sepolia"
  nativeSymbol: string; // "ETH"
  minConfirmations: number;
  assets: string[]; // withdrawable/depositable symbols on this chain
}

export interface CustodyConfig {
  configured: boolean; // false until the VPS has the custody env set
  chains: ChainInfo[];
  withdrawFees: Record<string, number>; // flat network fee per asset symbol
}

export interface DepositAddressInfo {
  chain: string;
  address: string;
  explorerUrl: string;
}

export interface CustodyDeposit {
  id: string;
  chain: string;
  symbol: string;
  amount: number;
  status: string; // PENDING | CREDITED
  confirmations: number;
  txHash: string;
  explorerUrl: string;
  createdAt: number;
}

export interface CustodyWithdrawal {
  id: string;
  chain: string;
  symbol: string;
  amount: number;
  status: string; // REQUESTED | BROADCAST | CONFIRMED | FAILED
  toAddress: string;
  txHash: string | null;
  explorerUrl: string | null;
  error: string | null;
  createdAt: number;
}

export interface CustodyHistory {
  deposits: CustodyDeposit[];
  withdrawals: CustodyWithdrawal[];
}
