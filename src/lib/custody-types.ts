// Client-safe custody types (no server imports).

export interface CustodyConfig {
  chain: string;
  nativeSymbol: string;
  minConfirmations: number;
  assets: string[]; // withdrawable/depositable symbols
  configured: boolean; // false until the VPS has the custody env set
}

export interface DepositAddressInfo {
  chain: string;
  address: string;
  explorerUrl: string;
}

export interface CustodyDeposit {
  id: string;
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
