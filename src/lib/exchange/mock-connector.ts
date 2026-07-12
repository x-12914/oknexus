import type {
  Candle,
  CandleInterval,
  ExchangeConnector,
  FiatCurrency,
  MarketInfo,
  OrderBookLevel,
  OrderBookSnapshot,
  CreateP2POrderInput,
  OrderResult,
  OtcConfig,
  OtcQuote,
  OtcQuoteInput,
  OtcResult,
  OtcTier,
  P2PAd,
  P2PAdFilter,
  P2PMerchant,
  P2PMessage,
  P2POrder,
  P2POrderAction,
  P2PPaymentMethod,
  PlaceOrderInput,
  RampPaymentMethod,
  RampQuote,
  RampQuoteInput,
  RampResult,
  RecentTrade,
  SwapAsset,
  SwapQuote,
  SwapResult,
  Ticker,
} from "./types";

const MARKETS: MarketInfo[] = [
  { symbol: "BTC/USDT", base: "BTC", quote: "USDT", tickSize: 0.1, stepSize: 0.000001, makerFee: 0.001, takerFee: 0.002 },
  { symbol: "ETH/USDT", base: "ETH", quote: "USDT", tickSize: 0.01, stepSize: 0.0001, makerFee: 0.001, takerFee: 0.002 },
  { symbol: "SOL/USDT", base: "SOL", quote: "USDT", tickSize: 0.01, stepSize: 0.01, makerFee: 0.001, takerFee: 0.002 },
  { symbol: "BNB/USDT", base: "BNB", quote: "USDT", tickSize: 0.01, stepSize: 0.001, makerFee: 0.001, takerFee: 0.002 },
  { symbol: "XRP/USDT", base: "XRP", quote: "USDT", tickSize: 0.0001, stepSize: 1, makerFee: 0.001, takerFee: 0.002 },
  { symbol: "ADA/USDT", base: "ADA", quote: "USDT", tickSize: 0.0001, stepSize: 1, makerFee: 0.001, takerFee: 0.002 },
];

const BASE_PRICE: Record<string, number> = {
  "BTC/USDT": 68420,
  "ETH/USDT": 3540,
  "SOL/USDT": 172.5,
  "BNB/USDT": 615.4,
  "XRP/USDT": 0.5842,
  "ADA/USDT": 0.4321,
};

// Seeded PRNG so a given symbol + minute produces a stable-looking book,
// while the price drifts over time.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function symbolSeed(symbol: string): number {
  let h = 2166136261;
  for (let i = 0; i < symbol.length; i++) {
    h ^= symbol.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function driftedPrice(symbol: string, t = Date.now()): number {
  const base = BASE_PRICE[symbol] ?? 100;
  const period = 60_000;
  const bucket = Math.floor(t / period);
  const rng = mulberry32(symbolSeed(symbol) ^ bucket);
  const swing = (rng() - 0.5) * 0.004;
  const micro = Math.sin(t / 3000) * 0.0006;
  return base * (1 + swing + micro);
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function buildBook(symbol: string, depth: number): OrderBookSnapshot {
  const market = MARKETS.find((m) => m.symbol === symbol) ?? MARKETS[0];
  const mid = driftedPrice(symbol);
  const bucket = Math.floor(Date.now() / 2000);
  const rng = mulberry32(symbolSeed(symbol) ^ bucket);

  const spread = mid * 0.0004;
  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];

  let bidRunning = 0;
  let askRunning = 0;

  for (let i = 0; i < depth; i++) {
    const bidPrice = roundTo(mid - spread / 2 - i * market.tickSize * (1 + rng() * 3), market.tickSize);
    const askPrice = roundTo(mid + spread / 2 + i * market.tickSize * (1 + rng() * 3), market.tickSize);
    const bidQty = roundTo(0.05 + rng() * (mid < 1 ? 20000 : mid < 100 ? 200 : 2), market.stepSize);
    const askQty = roundTo(0.05 + rng() * (mid < 1 ? 20000 : mid < 100 ? 200 : 2), market.stepSize);

    bidRunning += bidQty;
    askRunning += askQty;

    bids.push({ price: bidPrice, quantity: bidQty, total: bidRunning });
    asks.push({ price: askPrice, quantity: askQty, total: askRunning });
  }

  return { symbol, bids, asks, timestamp: Date.now() };
}

function buildTicker(symbol: string): Ticker {
  const now = Date.now();
  const last = driftedPrice(symbol, now);
  const dayAgo = driftedPrice(symbol, now - 24 * 60 * 60 * 1000);

  let high = last;
  let low = last;
  for (let h = 0; h < 24; h++) {
    const p = driftedPrice(symbol, now - h * 60 * 60 * 1000);
    if (p > high) high = p;
    if (p < low) low = p;
  }

  const changePct = ((last - dayAgo) / dayAgo) * 100;
  const rng = mulberry32(symbolSeed(symbol) ^ Math.floor(now / 60_000));
  const volume24h = (last < 1 ? 5_000_000 : last < 100 ? 500_000 : 20_000) * (0.7 + rng() * 0.6);

  return {
    symbol,
    last,
    bid: last * 0.9998,
    ask: last * 1.0002,
    high24h: high,
    low24h: low,
    volume24h,
    changePct24h: changePct,
  };
}

function buildRecentTrades(symbol: string, limit: number): RecentTrade[] {
  const trades: RecentTrade[] = [];
  const now = Date.now();
  for (let i = 0; i < limit; i++) {
    const t = now - i * (1500 + (i % 5) * 300);
    const rng = mulberry32(symbolSeed(symbol) ^ i ^ Math.floor(t / 2000));
    const price = driftedPrice(symbol, t) * (1 + (rng() - 0.5) * 0.0006);
    const side: "BUY" | "SELL" = rng() > 0.5 ? "BUY" : "SELL";
    const market = MARKETS.find((m) => m.symbol === symbol) ?? MARKETS[0];
    const quantity = roundTo(0.01 + rng() * (price < 1 ? 5000 : price < 100 ? 50 : 0.5), market.stepSize);
    trades.push({ id: `t_${t}_${i}`, symbol, price, quantity, side, timestamp: t });
  }
  return trades;
}

const INTERVAL_MS: Record<CandleInterval, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

function buildCandles(symbol: string, interval: CandleInterval, limit: number): Candle[] {
  const ms = INTERVAL_MS[interval];
  const now = Date.now();
  const alignedNow = Math.floor(now / ms) * ms;
  const candles: Candle[] = [];

  for (let i = limit - 1; i >= 0; i--) {
    const t = alignedNow - i * ms;
    const openT = t;
    const closeT = t + ms - 1;
    const open = driftedPrice(symbol, openT);
    const close = driftedPrice(symbol, closeT);
    let high = Math.max(open, close);
    let low = Math.min(open, close);
    for (let s = 0; s < 6; s++) {
      const p = driftedPrice(symbol, openT + (ms / 6) * s);
      if (p > high) high = p;
      if (p < low) low = p;
    }
    const rng = mulberry32(symbolSeed(symbol) ^ t);
    const volume = (Math.abs(close - open) + open * 0.0005) * (500 + rng() * 1500);
    candles.push({ time: Math.floor(openT / 1000), open, high, low, close, volume });
  }
  return candles;
}

// ---- Instant Swap ----

const SWAP_ASSETS: { symbol: string; name: string }[] = [
  { symbol: "USDT", name: "TetherUS" },
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "BNB", name: "BNB" },
  { symbol: "XRP", name: "XRP" },
  { symbol: "ADA", name: "Cardano" },
];

const SWAP_FEE = 0.003; // 0.30% taken from the received asset

function usdtPrice(symbol: string): number {
  if (symbol === "USDT") return 1;
  return driftedPrice(`${symbol}/USDT`);
}

type StoredQuote = SwapQuote;
const QUOTES = new Map<string, StoredQuote>();
let quoteCounter = 1;
let swapCounter = 1;

// ---- Crypto Ramp ----

const FIAT_CURRENCIES: FiatCurrency[] = [
  { code: "USD", name: "US Dollar", symbol: "$", usdPerUnit: 1 },
  { code: "EUR", name: "Euro", symbol: "€", usdPerUnit: 1.08 },
  { code: "GBP", name: "British Pound", symbol: "£", usdPerUnit: 1.27 },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", usdPerUnit: 1 / 1600 },
];

const RAMP_PAYMENT_METHODS: RampPaymentMethod[] = [
  { id: "card", name: "Debit/Credit Card", feePct: 0.025, etaLabel: "Instant", sides: ["BUY", "SELL"] },
  { id: "bank", name: "Bank Transfer", feePct: 0.005, etaLabel: "1–2 business days", sides: ["BUY", "SELL"] },
  { id: "wallet", name: "Mobile Wallet", feePct: 0.019, etaLabel: "Instant", sides: ["BUY", "SELL"] },
  { id: "wire", name: "Wire Transfer", feePct: 0.01, etaLabel: "Same day", sides: ["BUY"] },
];

const RAMP_NETWORK_FEE_USD = 1.5; // flat network/processing cost, charged in fiat

type StoredRampQuote = RampQuote;
const RAMP_QUOTES = new Map<string, StoredRampQuote>();
let rampQuoteCounter = 1;
let rampCounter = 1;

// ---- OTC Trading Desk ----

const OTC_MIN_NOTIONAL = 50_000;
const OTC_SETTLE_CURRENCIES = ["USDT", "USD"];
const OTC_BASE_SYMBOLS = ["BTC", "ETH", "SOL", "BNB"];

// Spread tightens as block size grows — the OTC value proposition.
const OTC_TIERS: OtcTier[] = [
  { minNotional: 50_000, maxNotional: 250_000, spreadPct: 0.15, label: "Tier 1 · $50K–$250K" },
  { minNotional: 250_000, maxNotional: 1_000_000, spreadPct: 0.1, label: "Tier 2 · $250K–$1M" },
  { minNotional: 1_000_000, maxNotional: 5_000_000, spreadPct: 0.06, label: "Tier 3 · $1M–$5M" },
  { minNotional: 5_000_000, maxNotional: null, spreadPct: 0.04, label: "Tier 4 · $5M+" },
];

function otcTierFor(notional: number): OtcTier {
  return (
    OTC_TIERS.find(
      (t) => notional >= t.minNotional && (t.maxNotional === null || notional < t.maxNotional),
    ) ?? OTC_TIERS[OTC_TIERS.length - 1]
  );
}

type StoredOtcQuote = OtcQuote;
const OTC_QUOTES = new Map<string, StoredOtcQuote>();
let otcQuoteCounter = 1;
let otcCounter = 1;

// ---- Peer-to-Peer marketplace ----

const DEMO_USER_NAME = "You";

const P2P_PAYMENT_METHODS: P2PPaymentMethod[] = [
  { id: "bank", name: "Bank Transfer" },
  { id: "wise", name: "Wise" },
  { id: "revolut", name: "Revolut" },
  { id: "paypal", name: "PayPal" },
  { id: "zelle", name: "Zelle" },
  { id: "sepa", name: "SEPA" },
  { id: "cashapp", name: "Cash App" },
  { id: "momo", name: "Mobile Money" },
];

const P2P_MERCHANTS: P2PMerchant[] = [
  { id: "m1", name: "USDTBaron", online: true, completedTrades: 5623, completionRatePct: 99.8, avgReleaseMinutes: 2, rating: 4.9, verified: true },
  { id: "m2", name: "CryptoKingNG", online: true, completedTrades: 1240, completionRatePct: 98.5, avgReleaseMinutes: 5, rating: 4.8, verified: true },
  { id: "m3", name: "FastTrade_Wise", online: true, completedTrades: 890, completionRatePct: 99.2, avgReleaseMinutes: 3, rating: 4.9, verified: true },
  { id: "m4", name: "AlphaOTC", online: false, completedTrades: 2310, completionRatePct: 97.0, avgReleaseMinutes: 8, rating: 4.6, verified: true },
  { id: "m5", name: "SwiftPay", online: true, completedTrades: 452, completionRatePct: 95.5, avgReleaseMinutes: 6, rating: 4.5, verified: false },
  { id: "m6", name: "GreenExchange", online: false, completedTrades: 121, completionRatePct: 92.0, avgReleaseMinutes: 12, rating: 4.2, verified: false },
];

function merchant(id: string): P2PMerchant {
  return P2P_MERCHANTS.find((m) => m.id === id) ?? P2P_MERCHANTS[0];
}

// Deterministic seed ads. Prices are fiat per 1 asset unit.
const P2P_ADS: P2PAd[] = [
  // USDT / USD
  { id: "a1", side: "SELL", asset: "USDT", fiat: "USD", price: 1.001, available: 45000, minLimit: 100, maxLimit: 20000, paymentMethods: ["bank", "wise", "zelle"], terms: "Release fast. Bank transfer must match your verified name.", merchant: merchant("m1") },
  { id: "a2", side: "SELL", asset: "USDT", fiat: "USD", price: 1.003, available: 12500, minLimit: 50, maxLimit: 5000, paymentMethods: ["revolut", "wise"], merchant: merchant("m3") },
  { id: "a3", side: "BUY", asset: "USDT", fiat: "USD", price: 0.998, available: 30000, minLimit: 200, maxLimit: 15000, paymentMethods: ["bank", "zelle"], merchant: merchant("m4") },
  { id: "a4", side: "BUY", asset: "USDT", fiat: "USD", price: 0.996, available: 8000, minLimit: 50, maxLimit: 3000, paymentMethods: ["paypal", "cashapp"], merchant: merchant("m5") },
  // USDT / NGN
  { id: "a5", side: "SELL", asset: "USDT", fiat: "NGN", price: 1655, available: 60000, minLimit: 50000, maxLimit: 20000000, paymentMethods: ["bank", "momo"], terms: "Opay/Palmpay/Bank. Do not write crypto in narration.", merchant: merchant("m2") },
  { id: "a6", side: "SELL", asset: "USDT", fiat: "NGN", price: 1662, available: 25000, minLimit: 20000, maxLimit: 5000000, paymentMethods: ["bank"], merchant: merchant("m6") },
  { id: "a7", side: "BUY", asset: "USDT", fiat: "NGN", price: 1648, available: 40000, minLimit: 100000, maxLimit: 10000000, paymentMethods: ["bank", "momo"], merchant: merchant("m2") },
  // BTC / USD
  { id: "a8", side: "SELL", asset: "BTC", fiat: "USD", price: 68950, available: 3.5, minLimit: 500, maxLimit: 60000, paymentMethods: ["bank", "wise"], merchant: merchant("m1") },
  { id: "a9", side: "BUY", asset: "BTC", fiat: "USD", price: 68150, available: 2.1, minLimit: 500, maxLimit: 40000, paymentMethods: ["bank", "zelle"], merchant: merchant("m4") },
  // USDT / EUR
  { id: "a10", side: "SELL", asset: "USDT", fiat: "EUR", price: 0.932, available: 18000, minLimit: 100, maxLimit: 8000, paymentMethods: ["sepa", "revolut"], merchant: merchant("m3") },
  { id: "a11", side: "BUY", asset: "USDT", fiat: "EUR", price: 0.928, available: 9500, minLimit: 100, maxLimit: 6000, paymentMethods: ["sepa"], merchant: merchant("m5") },
  { id: "a12", side: "SELL", asset: "ETH", fiat: "USD", price: 3560, available: 40, minLimit: 300, maxLimit: 30000, paymentMethods: ["bank", "wise", "revolut"], merchant: merchant("m1") },
];

type StoredP2POrder = P2POrder & { userId: string };
const P2P_ORDERS = new Map<string, StoredP2POrder>();
let p2pOrderCounter = 1;
let p2pMsgCounter = 1;

const P2P_PAYMENT_WINDOW_MIN = 15;

// ---- In-memory user orders (per process; fine for the mock). ----
type StoredOrder = OrderResult & { userId: string };
const ORDERS = new Map<string, StoredOrder>();
let orderCounter = 1;

export class MockExchangeConnector implements ExchangeConnector {
  readonly id = "mock";

  async listMarkets(): Promise<MarketInfo[]> {
    return MARKETS;
  }

  async getTicker(symbol: string): Promise<Ticker> {
    return buildTicker(symbol);
  }

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBookSnapshot> {
    return buildBook(symbol, depth);
  }

  async getRecentTrades(symbol: string, limit = 30): Promise<RecentTrade[]> {
    return buildRecentTrades(symbol, limit);
  }

  async getCandles(symbol: string, interval: CandleInterval, limit = 200): Promise<Candle[]> {
    return buildCandles(symbol, interval, limit);
  }

  async placeOrder(input: PlaceOrderInput): Promise<OrderResult> {
    const ticker = await this.getTicker(input.symbol);
    const id = `o_${Date.now()}_${orderCounter++}`;
    const isMarket = input.type === "MARKET";
    const fillPrice = isMarket ? (input.side === "BUY" ? ticker.ask : ticker.bid) : input.price;

    const order: StoredOrder = {
      id,
      userId: input.userId,
      symbol: input.symbol,
      side: input.side,
      type: input.type,
      price: input.price,
      quantity: input.quantity,
      filledQty: isMarket ? input.quantity : 0,
      avgFillPrice: isMarket ? fillPrice : undefined,
      status: isMarket ? "FILLED" : "OPEN",
      createdAt: Date.now(),
    };

    ORDERS.set(id, order);
    return order;
  }

  async cancelOrder(userId: string, orderId: string): Promise<OrderResult> {
    const order = ORDERS.get(orderId);
    if (!order || order.userId !== userId) {
      throw new Error("Order not found");
    }
    if (order.status === "OPEN" || order.status === "PARTIAL") {
      order.status = "CANCELLED";
      ORDERS.set(orderId, order);
    }
    return order;
  }

  async listOpenOrders(userId: string, symbol?: string): Promise<OrderResult[]> {
    const all = Array.from(ORDERS.values()).filter(
      (o) => o.userId === userId && (o.status === "OPEN" || o.status === "PARTIAL"),
    );
    return symbol ? all.filter((o) => o.symbol === symbol) : all;
  }

  // USD reference price for an asset. Overridable so a real connector can
  // supply live prices to the swap/ramp/OTC quote engines.
  protected async priceOf(symbol: string): Promise<number> {
    return usdtPrice(symbol);
  }

  async listSwapAssets(): Promise<SwapAsset[]> {
    return Promise.all(
      SWAP_ASSETS.map(async (a) => ({ ...a, usdtPrice: await this.priceOf(a.symbol) })),
    );
  }

  async getSwapQuote(
    fromSymbol: string,
    toSymbol: string,
    fromAmount: number,
  ): Promise<SwapQuote> {
    if (fromSymbol === toSymbol) {
      throw new Error("Cannot swap an asset for itself");
    }
    if (!(fromAmount > 0)) {
      throw new Error("Amount must be positive");
    }

    const fromUsd = await this.priceOf(fromSymbol);
    const toUsd = await this.priceOf(toSymbol);
    const notionalUsd = fromAmount * fromUsd;

    // Price impact grows with notional; caps at ~1.5%.
    const priceImpactPct = Math.min(1.5, (notionalUsd / 4_000_000) * 100);

    const grossTo = (notionalUsd / toUsd) * (1 - priceImpactPct / 100);
    const feeAmount = grossTo * SWAP_FEE;
    const toAmount = grossTo - feeAmount;

    const quote: SwapQuote = {
      quoteId: `q_${Date.now()}_${quoteCounter++}`,
      fromSymbol,
      toSymbol,
      fromAmount,
      toAmount,
      rate: toAmount / fromAmount,
      feeSymbol: toSymbol,
      feeAmount,
      priceImpactPct,
      expiresAt: Date.now() + 15_000,
    };

    QUOTES.set(quote.quoteId, quote);
    return quote;
  }

  async executeSwap(_userId: string, quoteId: string): Promise<SwapResult> {
    const quote = QUOTES.get(quoteId);
    if (!quote) {
      throw new Error("Quote not found");
    }
    if (Date.now() > quote.expiresAt) {
      QUOTES.delete(quoteId);
      throw new Error("Quote expired");
    }
    QUOTES.delete(quoteId);
    return {
      id: `s_${Date.now()}_${swapCounter++}`,
      fromSymbol: quote.fromSymbol,
      toSymbol: quote.toSymbol,
      fromAmount: quote.fromAmount,
      toAmount: quote.toAmount,
      rate: quote.rate,
      status: "FILLED",
      createdAt: Date.now(),
    };
  }

  async listFiatCurrencies(): Promise<FiatCurrency[]> {
    return FIAT_CURRENCIES;
  }

  async listRampPaymentMethods(): Promise<RampPaymentMethod[]> {
    return RAMP_PAYMENT_METHODS;
  }

  async getRampQuote(input: RampQuoteInput): Promise<RampQuote> {
    const { side, fiatCode, cryptoSymbol, paymentMethodId, amount } = input;

    const fiat = FIAT_CURRENCIES.find((f) => f.code === fiatCode);
    if (!fiat) throw new Error(`Unsupported fiat currency: ${fiatCode}`);

    const method = RAMP_PAYMENT_METHODS.find((m) => m.id === paymentMethodId);
    if (!method) throw new Error(`Unsupported payment method: ${paymentMethodId}`);
    if (!method.sides.includes(side)) {
      throw new Error(`${method.name} does not support ${side.toLowerCase()} orders`);
    }
    if (!(amount > 0)) throw new Error("Amount must be positive");

    const cryptoUsd = await this.priceOf(cryptoSymbol);
    // Fiat units per 1 whole crypto (the headline rate).
    const rate = cryptoUsd / fiat.usdPerUnit;
    const networkFee = RAMP_NETWORK_FEE_USD / fiat.usdPerUnit; // in fiat

    let fiatAmount: number;
    let cryptoAmount: number;
    let processingFee: number;
    let totalFiat: number;

    if (side === "BUY") {
      // `amount` is the fiat the user spends (total charged).
      totalFiat = amount;
      processingFee = amount * method.feePct;
      const spendable = amount - processingFee - networkFee;
      if (spendable <= 0) throw new Error("Amount too small to cover fees");
      cryptoAmount = spendable / rate;
      fiatAmount = amount;
    } else {
      // `amount` is the crypto the user sells.
      cryptoAmount = amount;
      const grossFiat = amount * rate;
      processingFee = grossFiat * method.feePct;
      totalFiat = grossFiat - processingFee - networkFee;
      if (totalFiat <= 0) throw new Error("Amount too small to cover fees");
      fiatAmount = grossFiat;
    }

    const quote: RampQuote = {
      quoteId: `r_${Date.now()}_${rampQuoteCounter++}`,
      side,
      fiatCode,
      cryptoSymbol,
      paymentMethodId,
      fiatAmount,
      cryptoAmount,
      rate,
      processingFee,
      networkFee,
      totalFiat,
      etaLabel: method.etaLabel,
      expiresAt: Date.now() + 15_000,
    };

    RAMP_QUOTES.set(quote.quoteId, quote);
    return quote;
  }

  async executeRamp(_userId: string, quoteId: string): Promise<RampResult> {
    const quote = RAMP_QUOTES.get(quoteId);
    if (!quote) throw new Error("Quote not found");
    if (Date.now() > quote.expiresAt) {
      RAMP_QUOTES.delete(quoteId);
      throw new Error("Quote expired");
    }
    RAMP_QUOTES.delete(quoteId);
    // Card/wallet/wire settle instantly in the mock; bank transfer is pending.
    const status = quote.paymentMethodId === "bank" ? "PENDING" : "COMPLETED";
    return {
      id: `rp_${Date.now()}_${rampCounter++}`,
      side: quote.side,
      fiatCode: quote.fiatCode,
      cryptoSymbol: quote.cryptoSymbol,
      fiatAmount: quote.fiatAmount,
      totalFiat: quote.totalFiat,
      cryptoAmount: quote.cryptoAmount,
      status,
      createdAt: Date.now(),
    };
  }

  async getOtcConfig(): Promise<OtcConfig> {
    return {
      minNotional: OTC_MIN_NOTIONAL,
      settleCurrencies: OTC_SETTLE_CURRENCIES,
      baseSymbols: OTC_BASE_SYMBOLS,
      tiers: OTC_TIERS,
    };
  }

  async getOtcQuote(input: OtcQuoteInput): Promise<OtcQuote> {
    const { side, baseSymbol, settleCurrency, baseAmount } = input;

    if (!OTC_BASE_SYMBOLS.includes(baseSymbol)) {
      throw new Error(`OTC desk does not cover ${baseSymbol}`);
    }
    if (!OTC_SETTLE_CURRENCIES.includes(settleCurrency)) {
      throw new Error(`Unsupported settlement currency: ${settleCurrency}`);
    }
    if (!(baseAmount > 0)) throw new Error("Amount must be positive");

    // USDT and USD are both ~1:1 to the USD reference price.
    const referencePrice = await this.priceOf(baseSymbol);
    const notionalAtMid = baseAmount * referencePrice;
    if (notionalAtMid < OTC_MIN_NOTIONAL) {
      throw new Error(
        `Below the $${OTC_MIN_NOTIONAL.toLocaleString()} OTC minimum (this order is ~$${Math.round(
          notionalAtMid,
        ).toLocaleString()})`,
      );
    }

    const tier = otcTierFor(notionalAtMid);
    const spread = tier.spreadPct / 100;
    const price =
      side === "BUY" ? referencePrice * (1 + spread) : referencePrice * (1 - spread);
    const notional = baseAmount * price;
    const totalCost = notional; // block trade, no extra taker fee on top of the spread

    // What the same size would cost sweeping the visible spot book (grows with size).
    const estSpotSlippagePct = Math.min(6, (notionalAtMid / 1_000_000) * 1.2);
    const spotSlip = estSpotSlippagePct / 100;
    const estSpotPrice =
      side === "BUY" ? referencePrice * (1 + spotSlip) : referencePrice * (1 - spotSlip);
    const estSpotCost = baseAmount * estSpotPrice;
    const savings = Math.abs(estSpotCost - totalCost);

    const quote: OtcQuote = {
      quoteId: `otc_${Date.now()}_${otcQuoteCounter++}`,
      side,
      baseSymbol,
      settleCurrency,
      baseAmount,
      referencePrice,
      price,
      spreadPct: tier.spreadPct,
      tierLabel: tier.label,
      notional,
      totalCost,
      estSpotSlippagePct,
      estSpotCost,
      savings,
      expiresAt: Date.now() + 30_000, // firm for 30s
    };

    OTC_QUOTES.set(quote.quoteId, quote);
    return quote;
  }

  async acceptOtcQuote(_userId: string, quoteId: string): Promise<OtcResult> {
    const quote = OTC_QUOTES.get(quoteId);
    if (!quote) throw new Error("Quote not found");
    if (Date.now() > quote.expiresAt) {
      OTC_QUOTES.delete(quoteId);
      throw new Error("Quote expired");
    }
    OTC_QUOTES.delete(quoteId);
    return {
      id: `otcf_${Date.now()}_${otcCounter++}`,
      side: quote.side,
      baseSymbol: quote.baseSymbol,
      settleCurrency: quote.settleCurrency,
      baseAmount: quote.baseAmount,
      price: quote.price,
      totalCost: quote.totalCost,
      status: "FILLED",
      createdAt: Date.now(),
    };
  }

  async listP2PPaymentMethods(): Promise<P2PPaymentMethod[]> {
    return P2P_PAYMENT_METHODS;
  }

  async listP2PAds(filter?: P2PAdFilter): Promise<P2PAd[]> {
    let ads = P2P_ADS.slice();
    if (filter?.side) ads = ads.filter((a) => a.side === filter.side);
    if (filter?.asset) ads = ads.filter((a) => a.asset === filter.asset);
    if (filter?.fiat) ads = ads.filter((a) => a.fiat === filter.fiat);
    if (filter?.paymentMethod)
      ads = ads.filter((a) => a.paymentMethods.includes(filter.paymentMethod!));
    // Best price first: buyers (taker BUY, ad SELL) want low price; sellers want high.
    ads.sort((a, b) => (a.side === "SELL" ? a.price - b.price : b.price - a.price));
    return ads;
  }

  async getP2PAd(adId: string): Promise<P2PAd | null> {
    return P2P_ADS.find((a) => a.id === adId) ?? null;
  }

  async createP2POrder(input: CreateP2POrderInput): Promise<P2POrder> {
    const { userId, adId, fiatAmount, paymentMethod } = input;
    const ad = P2P_ADS.find((a) => a.id === adId);
    if (!ad) throw new Error("Advertisement not found");
    if (fiatAmount < ad.minLimit || fiatAmount > ad.maxLimit) {
      throw new Error(
        `Amount must be between ${ad.minLimit.toLocaleString()} and ${ad.maxLimit.toLocaleString()} ${ad.fiat}`,
      );
    }
    if (!ad.paymentMethods.includes(paymentMethod)) {
      throw new Error("Unsupported payment method for this ad");
    }
    const assetAmount = fiatAmount / ad.price;
    if (assetAmount > ad.available) throw new Error("Amount exceeds available liquidity");

    // Ad SELL → merchant sells, taker (you) buys → you are the buyer.
    // Ad BUY  → merchant buys, taker (you) sells → you are the seller.
    const takerRole: "buyer" | "seller" = ad.side === "SELL" ? "buyer" : "seller";
    const buyerName = takerRole === "buyer" ? DEMO_USER_NAME : ad.merchant.name;
    const sellerName = takerRole === "seller" ? DEMO_USER_NAME : ad.merchant.name;

    const now = Date.now();
    const id = `p2p_${now}_${p2pOrderCounter++}`;
    const order: StoredP2POrder = {
      id,
      userId,
      adId,
      asset: ad.asset,
      fiat: ad.fiat,
      price: ad.price,
      assetAmount,
      fiatAmount,
      paymentMethod,
      status: "PENDING_PAYMENT",
      takerRole,
      buyerName,
      sellerName,
      merchant: ad.merchant,
      paymentWindowMinutes: P2P_PAYMENT_WINDOW_MIN,
      createdAt: now,
      expiresAt: now + P2P_PAYMENT_WINDOW_MIN * 60_000,
      messages: [
        {
          id: `msg_${now}_${p2pMsgCounter++}`,
          sender: "system",
          text: `Escrow locked ${assetAmount.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${ad.asset}. ${buyerName} to pay ${fiatAmount.toLocaleString()} ${ad.fiat} via ${this.methodName(paymentMethod)} within ${P2P_PAYMENT_WINDOW_MIN} minutes.`,
          timestamp: now,
        },
      ],
    };
    P2P_ORDERS.set(id, order);
    return order;
  }

  private methodName(id: string): string {
    return P2P_PAYMENT_METHODS.find((m) => m.id === id)?.name ?? id;
  }

  async getP2POrder(userId: string, orderId: string): Promise<P2POrder | null> {
    const o = P2P_ORDERS.get(orderId);
    if (!o || o.userId !== userId) return null;
    return o;
  }

  async listP2POrders(userId: string): Promise<P2POrder[]> {
    return Array.from(P2P_ORDERS.values())
      .filter((o) => o.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async actP2POrder(
    userId: string,
    orderId: string,
    action: P2POrderAction,
  ): Promise<P2POrder> {
    const order = P2P_ORDERS.get(orderId);
    if (!order || order.userId !== userId) throw new Error("Order not found");

    const push = (sender: P2PMessage["sender"], text: string) => {
      order.messages.push({
        id: `msg_${Date.now()}_${p2pMsgCounter++}`,
        sender,
        text,
        timestamp: Date.now(),
      });
    };

    switch (action) {
      case "MARK_PAID":
        if (order.status !== "PENDING_PAYMENT")
          throw new Error("Can only mark paid while awaiting payment");
        order.status = "PAID";
        push("system", `${order.buyerName} marked the payment as sent. Awaiting ${order.sellerName} to release escrow.`);
        break;
      case "RELEASE":
        if (order.status !== "PAID")
          throw new Error("Escrow can only be released after payment is marked");
        order.status = "COMPLETED";
        order.completedAt = Date.now();
        push("system", `${order.sellerName} released ${order.assetAmount.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${order.asset} from escrow. Trade complete.`);
        break;
      case "CANCEL":
        if (order.status !== "PENDING_PAYMENT")
          throw new Error("Only unpaid orders can be cancelled");
        order.status = "CANCELLED";
        push("system", `Order cancelled. ${order.assetAmount.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${order.asset} returned to ${order.sellerName}.`);
        break;
      case "DISPUTE":
        if (order.status !== "PAID")
          throw new Error("Disputes can only be raised after payment is marked");
        order.status = "DISPUTED";
        push("system", "Dispute opened. A CryptX moderator will review the evidence and mediate.");
        break;
      default:
        throw new Error("Unknown action");
    }
    return order;
  }

  async sendP2PMessage(userId: string, orderId: string, text: string): Promise<P2POrder> {
    const order = P2P_ORDERS.get(orderId);
    if (!order || order.userId !== userId) throw new Error("Order not found");
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Message is empty");
    // The demo user speaks as whichever side they took.
    order.messages.push({
      id: `msg_${Date.now()}_${p2pMsgCounter++}`,
      sender: order.takerRole,
      text: trimmed.slice(0, 500),
      timestamp: Date.now(),
    });
    return order;
  }
}
