// Client-safe earn/staking types (no server imports).

export interface EarnProduct {
  symbol: string;
  name: string;
  apy: number;
}

export interface StakeView {
  id: string;
  symbol: string;
  principal: number;
  apy: number;
  accrued: number; // rewards so far, in the staked asset (live estimate)
  createdAt: number;
}

export interface EarnData {
  products: EarnProduct[];
  positions: StakeView[];
  prices: Record<string, number>; // symbol → USD price
}
