import { MockExchangeConnector } from "./mock-connector";
import type {
  Candle,
  CandleInterval,
  OrderBookLevel,
  OrderBookSnapshot,
  RecentTrade,
  Ticker,
} from "./types";

// Real spot market data from Binance's public REST API (no key required).
// Everything else (orders, swap, ramp, OTC, P2P) is inherited from the mock.
const BASE = process.env.BINANCE_API_BASE ?? "https://api.binance.com";
const REQUEST_TIMEOUT_MS = 5000;
const CIRCUIT_COOLDOWN_MS = 30_000;

interface BinanceTicker {
  lastPrice: string;
  bidPrice: string;
  askPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChangePercent: string;
}
interface BinanceTrade {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}
type BinanceDepth = { bids: [string, string][]; asks: [string, string][] };
type BinanceKline = [number, string, string, string, string, string, ...unknown[]];

// Short-lived response cache keyed by URL, so the polling UI doesn't hammer the API.
const cache = new Map<string, { expires: number; data: unknown }>();
// Circuit breaker: after a failure, skip Binance for a cooldown and serve the mock
// immediately instead of waiting on the timeout every request (e.g. when geo-blocked).
let downUntil = 0;

async function cachedJson<T>(url: string, ttlMs: number): Promise<T> {
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.data as T;
  if (now < downUntil) throw new Error("binance-circuit-open");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
    const data = (await res.json()) as T;
    cache.set(url, { expires: now + ttlMs, data });
    downUntil = 0;
    return data;
  } catch (e) {
    downUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function toBinanceSymbol(symbol: string): string {
  return symbol.replace("/", "").toUpperCase();
}

// Binance /depth only accepts specific limits.
const DEPTH_LIMITS = [5, 10, 20, 50, 100, 500, 1000];
function depthLimit(depth: number): number {
  return DEPTH_LIMITS.find((d) => d >= depth) ?? 100;
}

function toLevels(rows: [string, string][], depth: number): OrderBookLevel[] {
  let running = 0;
  return rows.slice(0, depth).map(([p, q]) => {
    const quantity = Number(q);
    running += quantity;
    return { price: Number(p), quantity, total: running };
  });
}

export class BinanceConnector extends MockExchangeConnector {
  // Live USD reference price feeding the swap/ramp/OTC quote engines. Reuses
  // getTicker (cached + mock fallback), so quotes match the live trade page.
  protected override async priceOf(symbol: string): Promise<number> {
    if (symbol === "USDT") return 1;
    const ticker = await this.getTicker(`${symbol}/USDT`);
    return ticker.last;
  }

  override async getTicker(symbol: string): Promise<Ticker> {
    try {
      const d = await cachedJson<BinanceTicker>(
        `${BASE}/api/v3/ticker/24hr?symbol=${toBinanceSymbol(symbol)}`,
        1500,
      );
      return {
        symbol,
        last: Number(d.lastPrice),
        bid: Number(d.bidPrice),
        ask: Number(d.askPrice),
        high24h: Number(d.highPrice),
        low24h: Number(d.lowPrice),
        volume24h: Number(d.volume),
        changePct24h: Number(d.priceChangePercent),
      };
    } catch {
      return super.getTicker(symbol);
    }
  }

  override async getOrderBook(symbol: string, depth = 20): Promise<OrderBookSnapshot> {
    try {
      const d = await cachedJson<BinanceDepth>(
        `${BASE}/api/v3/depth?symbol=${toBinanceSymbol(symbol)}&limit=${depthLimit(depth)}`,
        1000,
      );
      return {
        symbol,
        bids: toLevels(d.bids, depth),
        asks: toLevels(d.asks, depth),
        timestamp: Date.now(),
      };
    } catch {
      return super.getOrderBook(symbol, depth);
    }
  }

  override async getRecentTrades(symbol: string, limit = 30): Promise<RecentTrade[]> {
    try {
      const d = await cachedJson<BinanceTrade[]>(
        `${BASE}/api/v3/trades?symbol=${toBinanceSymbol(symbol)}&limit=${limit}`,
        1500,
      );
      // Binance returns oldest→newest; the tape wants newest first.
      return d
        .map((t) => ({
          id: String(t.id),
          symbol,
          price: Number(t.price),
          quantity: Number(t.qty),
          side: (t.isBuyerMaker ? "SELL" : "BUY") as RecentTrade["side"],
          timestamp: t.time,
        }))
        .reverse();
    } catch {
      return super.getRecentTrades(symbol, limit);
    }
  }

  override async getCandles(
    symbol: string,
    interval: CandleInterval,
    limit = 200,
  ): Promise<Candle[]> {
    try {
      const d = await cachedJson<BinanceKline[]>(
        `${BASE}/api/v3/klines?symbol=${toBinanceSymbol(symbol)}&interval=${interval}&limit=${limit}`,
        4000,
      );
      return d.map((k) => ({
        time: Math.floor(Number(k[0]) / 1000), // ms → s to match Candle.time
        open: Number(k[1]),
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
        volume: Number(k[5]),
      }));
    } catch {
      return super.getCandles(symbol, interval, limit);
    }
  }
}
