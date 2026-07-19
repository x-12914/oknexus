// Canonical wallet assets + the demo balance new accounts are seeded with.
export const WALLET_ASSETS: {
  symbol: string;
  name: string;
  isFiat: boolean;
  decimals: number;
  seed: number;
}[] = [
  { symbol: "USDT", name: "TetherUS", isFiat: false, decimals: 6, seed: 10000 },
  { symbol: "BTC", name: "Bitcoin", isFiat: false, decimals: 8, seed: 0.05 },
  { symbol: "ETH", name: "Ethereum", isFiat: false, decimals: 8, seed: 0.5 },
  { symbol: "SOL", name: "Solana", isFiat: false, decimals: 8, seed: 10 },
  { symbol: "BNB", name: "BNB", isFiat: false, decimals: 8, seed: 0 },
  { symbol: "XRP", name: "XRP", isFiat: false, decimals: 6, seed: 0 },
  { symbol: "ADA", name: "Cardano", isFiat: false, decimals: 6, seed: 0 },
];
