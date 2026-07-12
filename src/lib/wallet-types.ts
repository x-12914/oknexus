// Client-safe wallet types (no server imports).
export interface PortfolioItem {
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  price: number;
}

export interface Portfolio {
  items: PortfolioItem[];
  totalUsd: number;
}
