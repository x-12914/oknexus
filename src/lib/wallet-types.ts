// Client-safe wallet types (no server imports).
export interface PortfolioItem {
  symbol: string;
  name: string;
  balance: number; // available
  locked: number; // reserved in open orders / escrow
  usdValue: number; // (balance + locked) valued at price
  price: number;
}

export interface Portfolio {
  items: PortfolioItem[];
  totalUsd: number;
}

// A single spendable-balance movement from the ledger journal.
export interface LedgerActivity {
  id: string;
  symbol: string;
  delta: number; // signed change to available balance
  balanceAfter: number;
  type: string; // SEED | SWAP | RAMP | SPOT | OTC | P2P | DEPOSIT | WITHDRAWAL | ADJUSTMENT
  memo: string | null;
  createdAt: number; // epoch ms
}
