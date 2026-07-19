import { BinanceConnector } from "./binance-connector";
import type { Ticker } from "./types";

/**
 * Market data (prices + 24h stats) from CoinGecko — the client's chosen market-data
 * provider. CoinGecko has no order book or trade tape, so those (and candles) are
 * inherited from Binance. Fallback chain per call: CoinGecko → Binance → mock.
 *
 * Env: COINGECKO_API_KEY (Demo key by default; set COINGECKO_API_BASE to the pro URL
 * for a Pro key).
 */
const CG_BASE = process.env.COINGECKO_API_BASE ?? "https://api.coingecko.com/api/v3";
const TTL_MS = 8000;

// Our spot base symbols → CoinGecko coin ids.
const CG_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  USDT: "tether",
};

interface CgMarket {
  id: string;
  current_price: number;
  high_24h: number | null;
  low_24h: number | null;
  total_volume: number | null;
  price_change_percentage_24h: number | null;
}

let cache: { expires: number; byId: Map<string, CgMarket> } | undefined;

function cgHeaders(): Record<string, string> | undefined {
  const key = process.env.COINGECKO_API_KEY;
  if (!key) return undefined;
  return CG_BASE.includes("pro-api")
    ? { "x-cg-pro-api-key": key }
    : { "x-cg-demo-api-key": key };
}

/** One cached call fetches every tracked coin (all our pairs quote in USD≈USDT). */
async function fetchMarkets(): Promise<Map<string, CgMarket>> {
  const now = Date.now();
  if (cache && cache.expires > now) return cache.byId;
  const ids = Object.values(CG_ID).join(",");
  const url = `${CG_BASE}/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h&per_page=250`;
  const res = await fetch(url, { cache: "no-store", headers: cgHeaders() });
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const arr = (await res.json()) as CgMarket[];
  const byId = new Map(arr.map((m) => [m.id, m]));
  cache = { expires: now + TTL_MS, byId };
  return byId;
}

export class CoinGeckoConnector extends BinanceConnector {
  override async getTicker(symbol: string): Promise<Ticker> {
    const base = symbol.split("/")[0];
    const id = CG_ID[base];
    if (id) {
      try {
        const m = (await fetchMarkets()).get(id);
        if (m && typeof m.current_price === "number") {
          const last = m.current_price;
          return {
            symbol,
            last,
            bid: last,
            ask: last,
            high24h: m.high_24h ?? last,
            low24h: m.low_24h ?? last,
            volume24h: m.total_volume ?? 0,
            changePct24h: m.price_change_percentage_24h ?? 0,
          };
        }
      } catch {
        // fall through to Binance
      }
    }
    return super.getTicker(symbol);
  }
}
