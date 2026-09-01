import { MockExchangeConnector } from "./mock-connector";
import type {
  Candle,
  CandleInterval,
  OrderBookLevel,
  OrderBookSnapshot,
  RecentTrade,
  Ticker,
} from "./types";

/**
 * Spot market data from Kraken's public REST API (no key required).
 *
 * Exists because Binance answers this server with HTTP 451 — geo-blocked by
 * region — which silently pushed the order book, trade tape and candles onto
 * generated data while prices stayed roughly right from CoinGecko. Kraken
 * answers, and answers with a real book.
 *
 * The USDT pairs are used rather than Kraken's much deeper USD pairs. XXBTZUSD
 * carries about 28x the volume of XBTUSDT, so the USD book would look better —
 * but the market on screen says USDT, and showing a different pair's depth
 * under that label is the same class of quietly-wrong data this replaced.
 *
 * Everything that is not market data (orders, swap, ramp, OTC, P2P) is
 * inherited from the mock, exactly as the Binance connector does.
 */
const BASE = process.env.KRAKEN_API_BASE ?? "https://api.kraken.com";
const REQUEST_TIMEOUT_MS = 5000;
const CIRCUIT_COOLDOWN_MS = 30_000;

/**
 * Our base symbols to Kraken's. Kraken calls bitcoin XBT, and every one of our
 * listed assets has a USDT pair — checked against their AssetPairs endpoint
 * rather than assumed.
 */
const KRAKEN_BASE: Record<string, string> = {
  BTC: "XBT",
  ETH: "ETH",
  SOL: "SOL",
  BNB: "BNB",
  XRP: "XRP",
  ADA: "ADA",
};

/** Kraken measures candle intervals in minutes. */
const INTERVAL_MINUTES: Record<CandleInterval, number> = {
  "1m": 1,
  "5m": 5,
  "15m": 15,
  "1h": 60,
  "4h": 240,
  "1d": 1440,
};

function toKrakenPair(symbol: string): string {
  const [base, quote] = symbol.split("/");
  return `${KRAKEN_BASE[base] ?? base}${quote ?? "USDT"}`;
}

interface KrakenEnvelope<T> {
  error: string[];
  result: Record<string, T>;
}

/** [price, whole-lot volume, last-24h volume] style tuples, all as strings. */
interface KrakenTicker {
  a: string[];
  b: string[];
  c: string[];
  v: string[];
  l: string[];
  h: string[];
  o: string;
}
type KrakenDepth = { asks: [string, string, number][]; bids: [string, string, number][] };
type KrakenTrade = [string, string, number, string, string, string, number];
type KrakenOhlc = [number, string, string, string, string, string, string, number];

const cache = new Map<string, { expires: number; data: unknown }>();
// After a failure, skip Kraken for a cooldown rather than paying the timeout on
// every request. Without this a single outage makes the whole app feel broken.
let downUntil = 0;

/**
 * Kraken reports failures in an `error` array with HTTP 200, so a plain
 * `res.ok` check would happily return an empty result as success.
 */
async function cachedJson<T>(url: string, ttlMs: number): Promise<Record<string, T>> {
  const now = Date.now();
  if (now < downUntil) throw new Error("kraken: cooling down");

  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.data as Record<string, T>;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`kraken: HTTP ${res.status}`);
    const body = (await res.json()) as KrakenEnvelope<T>;
    if (body.error?.length) throw new Error(`kraken: ${body.error.join(", ")}`);
    if (!body.result) throw new Error("kraken: empty result");
    cache.set(url, { expires: now + ttlMs, data: body.result });
    return body.result;
  } catch (e) {
    downUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Kraken keys results by its own canonical pair name, which is not always the
 * one asked for — XBTUSD comes back as XXBTZUSD. Taking the first value avoids
 * guessing their aliasing rules.
 */
function first<T>(result: Record<string, T>): T {
  const values = Object.values(result);
  if (values.length === 0) throw new Error("kraken: no pair in result");
  return values[0];
}

function toLevels(rows: [string, string, number][], depth: number): OrderBookLevel[] {
  let running = 0;
  return rows.slice(0, depth).map(([p, q]) => {
    const quantity = Number(q);
    running += quantity;
    return { price: Number(p), quantity, total: running };
  });
}

export class KrakenConnector extends MockExchangeConnector {
  readonly id = "kraken";

  // Live USD reference price for the swap/ramp/OTC quote engines, so those
  // quotes agree with the price shown on the trade page.
  protected override async priceOf(symbol: string): Promise<number> {
    if (symbol === "USDT") return 1;
    const ticker = await this.getTicker(`${symbol}/USDT`);
    return ticker.last;
  }

  override async getTicker(symbol: string): Promise<Ticker> {
    try {
      const t = first(
        await cachedJson<KrakenTicker>(
          `${BASE}/0/public/Ticker?pair=${toKrakenPair(symbol)}`,
          1500,
        ),
      );
      const last = Number(t.c[0]);
      const open = Number(t.o);
      // v[1] is 24h volume in the BASE asset; every other connector reports
      // quote-denominated volume, so convert rather than let the same field
      // mean different things depending on who answered.
      const baseVolume24h = Number(t.v[1]);
      return {
        symbol,
        last,
        bid: Number(t.b[0]),
        ask: Number(t.a[0]),
        high24h: Number(t.h[1]),
        low24h: Number(t.l[1]),
        volume24h: baseVolume24h * last,
        changePct24h: open > 0 ? ((last - open) / open) * 100 : 0,
      };
    } catch {
      return super.getTicker(symbol);
    }
  }

  override async getOrderBook(symbol: string, depth = 20): Promise<OrderBookSnapshot> {
    try {
      const d = first(
        await cachedJson<KrakenDepth>(
          `${BASE}/0/public/Depth?pair=${toKrakenPair(symbol)}&count=${Math.min(depth, 500)}`,
          1000,
        ),
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
      const rows = first(
        await cachedJson<KrakenTrade[]>(
          `${BASE}/0/public/Trades?pair=${toKrakenPair(symbol)}&count=${Math.min(limit, 1000)}`,
          1500,
        ),
      );
      return rows
        .slice(-limit)
        .reverse()
        .map(([price, qty, time, side, , , id]) => ({
          id: String(id),
          symbol,
          price: Number(price),
          quantity: Number(qty),
          // Kraken marks the aggressor as "b" or "s".
          side: side === "b" ? ("BUY" as const) : ("SELL" as const),
          // Their timestamp is fractional seconds, not milliseconds.
          timestamp: Math.round(time * 1000),
        }));
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
      const rows = first(
        await cachedJson<KrakenOhlc[]>(
          `${BASE}/0/public/OHLC?pair=${toKrakenPair(symbol)}&interval=${INTERVAL_MINUTES[interval]}`,
          5000,
        ),
      );
      // Kraken ignores a count parameter and returns a fixed window, so trim to
      // the most recent `limit` candles here.
      return rows.slice(-limit).map(([time, open, high, low, close, , volume]) => ({
        time: time * 1000,
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume),
      }));
    } catch {
      return super.getCandles(symbol, interval, limit);
    }
  }
}
