import type {
  Candle,
  CandleInterval,
  MarketInfo,
  OrderBookSnapshot,
  OrderResult,
  OrderSide,
  OrderType,
  RecentTrade,
  SwapAsset,
  SwapQuote,
  SwapResult,
  FiatCurrency,
  RampPaymentMethod,
  RampQuote,
  RampQuoteInput,
  RampResult,
  OtcConfig,
  OtcQuote,
  OtcQuoteInput,
  OtcResult,
  P2PAd,
  P2PPaymentMethod,
  P2POrder,
  P2POrderAction,
  Ticker,
} from "@/lib/exchange/types";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  markets: () =>
    fetch("/api/markets", { cache: "no-store" }).then((r) =>
      j<{ markets: MarketInfo[] }>(r),
    ),

  ticker: (pair: string) =>
    fetch(`/api/markets/${pair}/ticker`, { cache: "no-store" }).then((r) =>
      j<Ticker>(r),
    ),

  orderBook: (pair: string, depth = 20) =>
    fetch(`/api/markets/${pair}/orderbook?depth=${depth}`, { cache: "no-store" }).then(
      (r) => j<OrderBookSnapshot>(r),
    ),

  trades: (pair: string, limit = 30) =>
    fetch(`/api/markets/${pair}/trades?limit=${limit}`, { cache: "no-store" }).then(
      (r) => j<{ trades: RecentTrade[] }>(r),
    ),

  candles: (pair: string, interval: CandleInterval, limit = 200) =>
    fetch(`/api/markets/${pair}/candles?interval=${interval}&limit=${limit}`, {
      cache: "no-store",
    }).then((r) => j<{ candles: Candle[] }>(r)),

  placeOrder: (input: {
    pair: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price?: number;
  }) =>
    fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => j<OrderResult>(r)),

  openOrders: (pair?: string) =>
    fetch(`/api/orders${pair ? `?pair=${pair}` : ""}`, { cache: "no-store" }).then(
      (r) => j<{ orders: OrderResult[] }>(r),
    ),

  cancelOrder: (id: string) =>
    fetch(`/api/orders/${id}`, { method: "DELETE" }).then((r) => j<OrderResult>(r)),

  swapAssets: () =>
    fetch("/api/swap/assets", { cache: "no-store" }).then((r) =>
      j<{ assets: SwapAsset[] }>(r),
    ),

  swapQuote: (from: string, to: string, amount: number) =>
    fetch("/api/swap/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from, to, amount }),
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).error ?? "Quote failed");
      return (await r.json()) as SwapQuote;
    }),

  swapExecute: (quoteId: string) =>
    fetch("/api/swap/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quoteId }),
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).error ?? "Swap failed");
      return (await r.json()) as SwapResult;
    }),

  rampConfig: () =>
    fetch("/api/ramp/config", { cache: "no-store" }).then((r) =>
      j<{ currencies: FiatCurrency[]; methods: RampPaymentMethod[] }>(r),
    ),

  rampQuote: (input: RampQuoteInput) =>
    fetch("/api/ramp/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).error ?? "Quote failed");
      return (await r.json()) as RampQuote;
    }),

  rampExecute: (quoteId: string) =>
    fetch("/api/ramp/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quoteId }),
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).error ?? "Payment failed");
      return (await r.json()) as RampResult;
    }),

  otcConfig: () =>
    fetch("/api/otc/config", { cache: "no-store" }).then((r) => j<OtcConfig>(r)),

  otcQuote: (input: OtcQuoteInput) =>
    fetch("/api/otc/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).error ?? "Quote failed");
      return (await r.json()) as OtcQuote;
    }),

  otcAccept: (quoteId: string) =>
    fetch("/api/otc/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quoteId }),
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).error ?? "Settlement failed");
      return (await r.json()) as OtcResult;
    }),

  p2pPaymentMethods: () =>
    fetch("/api/p2p/payment-methods", { cache: "no-store" }).then((r) =>
      j<{ methods: P2PPaymentMethod[] }>(r),
    ),

  p2pAds: (params: { side?: string; asset?: string; fiat?: string; method?: string } = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    return fetch(`/api/p2p/ads?${qs.toString()}`, { cache: "no-store" }).then((r) =>
      j<{ ads: P2PAd[] }>(r),
    );
  },

  p2pCreateOrder: (adId: string, fiatAmount: number, paymentMethod: string) =>
    fetch("/api/p2p/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ adId, fiatAmount, paymentMethod }),
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).error ?? "Could not open trade");
      return (await r.json()) as P2POrder;
    }),

  p2pOrders: () =>
    fetch("/api/p2p/orders", { cache: "no-store" }).then((r) =>
      j<{ orders: P2POrder[] }>(r),
    ),

  p2pOrder: (id: string) =>
    fetch(`/api/p2p/orders/${id}`, { cache: "no-store" }).then((r) => j<P2POrder>(r)),

  p2pAction: (id: string, action: P2POrderAction) =>
    fetch(`/api/p2p/orders/${id}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).error ?? "Action failed");
      return (await r.json()) as P2POrder;
    }),

  p2pSendMessage: (id: string, text: string) =>
    fetch(`/api/p2p/orders/${id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).error ?? "Could not send");
      return (await r.json()) as P2POrder;
    }),
};
