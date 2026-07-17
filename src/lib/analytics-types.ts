// Client-safe analytics types (no server imports).

export interface AssetSlice {
  symbol: string;
  name: string;
  usdValue: number;
  pct: number; // share of the portfolio, 0–100
  changePct24h: number;
}

export interface TypeStat {
  type: string; // ledger type: SPOT, SWAP, RAMP, OTC, P2P, DEPOSIT, WITHDRAWAL, TRANSFER, SEED, …
  count: number;
  netUsd: number; // net flow into (+) / out of (−) available balance, valued now
}

export interface VolumePoint {
  date: string; // YYYY-MM-DD
  volumeUsd: number;
}

export interface Analytics {
  totalUsd: number;
  change24hUsd: number;
  change24hPct: number;
  assets: AssetSlice[];
  totals: { trades: number; volumeUsd: number; feesUsd: number };
  byType: TypeStat[];
  volumeSeries: VolumePoint[]; // last 30 days
  generatedAt: number;
}
