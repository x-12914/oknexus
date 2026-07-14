export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";
export type OrderStatus = "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED" | "REJECTED";

export interface MarketInfo {
  symbol: string;
  base: string;
  quote: string;
  tickSize: number;
  stepSize: number;
  makerFee: number;
  takerFee: number;
}

export interface Ticker {
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  changePct24h: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBookSnapshot {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface RecentTrade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: OrderSide;
  timestamp: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PlaceOrderInput {
  userId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
}

export interface OrderResult {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price?: number;
  quantity: number;
  filledQty: number;
  avgFillPrice?: number;
  status: OrderStatus;
  createdAt: number;
}

export type CandleInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

// ---- Instant Swap ----

export interface SwapAsset {
  symbol: string;
  name: string;
  usdtPrice: number;
}

export interface SwapQuote {
  quoteId: string;
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  toAmount: number;
  rate: number; // units of `to` per 1 unit of `from`
  feeSymbol: string;
  feeAmount: number;
  priceImpactPct: number;
  expiresAt: number;
}

export interface SwapResult {
  id: string;
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  status: "FILLED" | "EXPIRED" | "REJECTED";
  createdAt: number;
}

// ---- Crypto Ramp (fiat on/off-ramp) ----

export type RampSide = "BUY" | "SELL";

export interface FiatCurrency {
  code: string; // "USD"
  name: string; // "US Dollar"
  symbol: string; // "$"
  usdPerUnit: number; // 1 unit of this fiat = this many USD
}

export interface RampPaymentMethod {
  id: string;
  name: string;
  feePct: number; // fraction, e.g. 0.025 for 2.5%
  etaLabel: string;
  sides: RampSide[]; // which directions the method supports
}

export interface RampQuoteInput {
  side: RampSide;
  fiatCode: string;
  cryptoSymbol: string;
  paymentMethodId: string;
  amount: number; // BUY: fiat spent; SELL: crypto sold
}

export interface RampQuote {
  quoteId: string;
  side: RampSide;
  fiatCode: string;
  cryptoSymbol: string;
  paymentMethodId: string;
  fiatAmount: number; // gross fiat (BUY: charged before fees basis; SELL: gross proceeds)
  cryptoAmount: number; // crypto received (BUY) or sold (SELL)
  rate: number; // fiat per 1 crypto
  processingFee: number; // in fiat
  networkFee: number; // in fiat
  totalFiat: number; // BUY: total charged; SELL: net received
  etaLabel: string;
  expiresAt: number;
}

export interface RampResult {
  id: string;
  side: RampSide;
  fiatCode: string;
  cryptoSymbol: string;
  paymentMethodId: string;
  fiatAmount: number; // gross fiat
  totalFiat: number; // BUY: total charged; SELL: net received
  cryptoAmount: number;
  status: "COMPLETED" | "PENDING" | "EXPIRED";
  createdAt: number;
}

// ---- OTC Trading Desk (RFQ) ----

export interface OtcTier {
  minNotional: number;
  maxNotional: number | null; // null = no upper bound
  spreadPct: number; // percent, e.g. 0.10 means 0.10%
  label: string;
}

export interface OtcConfig {
  minNotional: number;
  settleCurrencies: string[]; // e.g. ["USDT", "USD"]
  baseSymbols: string[];
  tiers: OtcTier[];
}

export interface OtcQuoteInput {
  side: OrderSide;
  baseSymbol: string;
  settleCurrency: string;
  baseAmount: number;
}

export interface OtcQuote {
  quoteId: string;
  side: OrderSide;
  baseSymbol: string;
  settleCurrency: string;
  baseAmount: number;
  referencePrice: number; // mid-market reference
  price: number; // firm executable price incl. desk spread
  spreadPct: number;
  tierLabel: string;
  notional: number; // baseAmount * price, in settle currency
  totalCost: number; // BUY: total to pay; SELL: total to receive
  estSpotSlippagePct: number; // what a spot market order this size would cost
  estSpotCost: number; // comparable spot total (for savings display)
  savings: number; // positive = OTC is cheaper/better than spot
  expiresAt: number; // firm for a fixed window
}

export interface OtcResult {
  id: string;
  side: OrderSide;
  baseSymbol: string;
  settleCurrency: string;
  baseAmount: number;
  price: number;
  totalCost: number;
  status: "FILLED" | "EXPIRED";
  createdAt: number;
}

// ---- Peer-to-Peer (P2P) marketplace ----

export interface P2PMerchant {
  id: string;
  name: string;
  online: boolean;
  completedTrades: number;
  completionRatePct: number;
  avgReleaseMinutes: number;
  rating: number; // 0–5
  verified: boolean;
}

export interface P2PPaymentMethod {
  id: string;
  name: string;
}

// `side` is the ADVERTISER's action: SELL = merchant sells crypto (taker buys);
// BUY = merchant buys crypto (taker sells).
export interface P2PAd {
  id: string;
  side: OrderSide;
  asset: string; // e.g. "USDT", "BTC"
  fiat: string; // e.g. "USD", "NGN", "EUR"
  price: number; // fiat per 1 asset unit
  available: number; // asset units available
  minLimit: number; // fiat
  maxLimit: number; // fiat
  paymentMethods: string[]; // payment method ids
  terms?: string;
  merchant: P2PMerchant;
}

export interface P2PAdFilter {
  side?: OrderSide;
  asset?: string;
  fiat?: string;
  paymentMethod?: string;
}

export interface P2PMyAd extends P2PAd {
  active: boolean;
}

export interface CreateP2PAdInput {
  side: OrderSide; // advertiser's action: SELL = you sell crypto; BUY = you buy
  asset: string;
  fiat: string;
  price: number;
  available: number;
  minLimit: number;
  maxLimit: number;
  paymentMethods: string[];
  terms?: string;
}

export type P2POrderStatus =
  | "PENDING_PAYMENT" // escrow locked; buyer must pay fiat
  | "PAID" // buyer marked paid; seller must release
  | "COMPLETED" // escrow released to buyer
  | "CANCELLED"
  | "DISPUTED";

export type P2POrderAction = "MARK_PAID" | "RELEASE" | "CANCEL" | "DISPUTE";

export type P2PParty = "buyer" | "seller" | "system";

export interface P2PMessage {
  id: string;
  sender: P2PParty;
  text: string;
  timestamp: number;
}

export interface P2POrder {
  id: string;
  adId: string;
  asset: string;
  fiat: string;
  price: number;
  assetAmount: number; // crypto held in escrow
  fiatAmount: number; // fiat the buyer pays
  paymentMethod: string;
  status: P2POrderStatus;
  takerRole: "buyer" | "seller"; // which side the demo user is on
  buyerName: string;
  sellerName: string;
  merchant: P2PMerchant;
  paymentWindowMinutes: number;
  createdAt: number;
  expiresAt: number;
  completedAt?: number;
  messages: P2PMessage[];
}

export interface CreateP2POrderInput {
  userId: string;
  adId: string;
  fiatAmount: number;
  paymentMethod: string;
}

export interface ExchangeConnector {
  readonly id: string;

  listMarkets(): Promise<MarketInfo[]>;
  getTicker(symbol: string): Promise<Ticker>;
  getOrderBook(symbol: string, depth?: number): Promise<OrderBookSnapshot>;
  getRecentTrades(symbol: string, limit?: number): Promise<RecentTrade[]>;
  getCandles(symbol: string, interval: CandleInterval, limit?: number): Promise<Candle[]>;

  placeOrder(input: PlaceOrderInput): Promise<OrderResult>;
  cancelOrder(userId: string, orderId: string): Promise<OrderResult>;
  listOpenOrders(userId: string, symbol?: string): Promise<OrderResult[]>;

  listSwapAssets(): Promise<SwapAsset[]>;
  getSwapQuote(fromSymbol: string, toSymbol: string, fromAmount: number): Promise<SwapQuote>;
  executeSwap(userId: string, quoteId: string): Promise<SwapResult>;

  listFiatCurrencies(): Promise<FiatCurrency[]>;
  listRampPaymentMethods(): Promise<RampPaymentMethod[]>;
  getRampQuote(input: RampQuoteInput): Promise<RampQuote>;
  executeRamp(userId: string, quoteId: string): Promise<RampResult>;

  getOtcConfig(): Promise<OtcConfig>;
  getOtcQuote(input: OtcQuoteInput): Promise<OtcQuote>;
  acceptOtcQuote(userId: string, quoteId: string): Promise<OtcResult>;

  listP2PPaymentMethods(): Promise<P2PPaymentMethod[]>;
  listP2PAds(filter?: P2PAdFilter): Promise<P2PAd[]>;
  getP2PAd(adId: string): Promise<P2PAd | null>;
  createP2POrder(input: CreateP2POrderInput): Promise<P2POrder>;
  getP2POrder(userId: string, orderId: string): Promise<P2POrder | null>;
  listP2POrders(userId: string): Promise<P2POrder[]>;
  actP2POrder(userId: string, orderId: string, action: P2POrderAction): Promise<P2POrder>;
  sendP2PMessage(userId: string, orderId: string, text: string): Promise<P2POrder>;
}
