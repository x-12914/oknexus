// Canonical wallet assets, plus the demo balance new accounts USED to be seeded
// with unconditionally.
//
// That seed is now opt-in. Once a real withdrawal rail exists, handing every
// registration 10,000 USDT of spendable balance means anyone who signs up can
// convert demo money into real naira up to the provider float. Demo balances
// and live payouts cannot both be on by default.

/**
 * Whether new accounts receive demo balances. Off unless explicitly enabled,
 * so a fresh or misconfigured environment fails closed rather than generous.
 */
export function demoSeedEnabled(): boolean {
  return process.env.ENABLE_DEMO_SEED === "true";
}

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
  // The ledger's first fiat asset. Two decimals because naira has kobo and
  // nothing smaller — carrying eight would invent precision the banking rail
  // cannot settle. Never seeded: a fiat balance may only come from money that
  // actually arrived.
  { symbol: "NGN", name: "Nigerian Naira", isFiat: true, decimals: 2, seed: 0 },
];
