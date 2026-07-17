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
  P2PMyAd,
  CreateP2PAdInput,
  P2PPaymentMethod,
  P2POrder,
  P2POrderAction,
  Ticker,
} from "@/lib/exchange/types";
import type { Portfolio, LedgerActivity } from "@/lib/wallet-types";
import type { NotificationView } from "@/lib/notification-types";
import type { Analytics } from "@/lib/analytics-types";
import type {
  CustodyConfig,
  DepositAddressInfo,
  CustodyHistory,
} from "@/lib/custody-types";
import type {
  AdminOverview,
  AdminUser,
  AdminDispute,
  AdminLedgerRow,
  AdminAd,
  AdminActionBody,
  KycInfo,
} from "@/lib/admin-types";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as T;
}

// For state-changing calls: a 401 means "not signed in" — send them to login.
async function mutate<T>(res: Response, fallbackMsg: string): Promise<T> {
  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Please sign in to continue.");
  }
  if (!res.ok) {
    const msg = await res
      .json()
      .then((b) => (b as { error?: string })?.error)
      .catch(() => undefined);
    throw new Error(msg ?? fallbackMsg);
  }
  return (await res.json()) as T;
}

export const api = {
  wallet: () => fetch("/api/wallet", { cache: "no-store" }).then((r) => j<Portfolio>(r)),

  transactions: () =>
    fetch("/api/transactions", { cache: "no-store" }).then((r) =>
      j<{ activity: LedgerActivity[] }>(r),
    ),

  analytics: () =>
    fetch("/api/analytics", { cache: "no-store" }).then((r) => j<Analytics>(r)),

  walletTransfer: (input: { toEmail: string; symbol: string; amount: number; note?: string }) =>
    fetch("/api/wallet/transfer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) =>
      mutate<{ ok: true; symbol: string; amount: number; toEmail: string; toName: string | null }>(
        r,
        "Transfer failed",
      ),
    ),

  notifications: () =>
    fetch("/api/notifications", { cache: "no-store" }).then((r) =>
      j<{ items: NotificationView[]; unread: number }>(r),
    ),

  markNotificationsRead: (ids?: string[]) =>
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids }),
    }).then((r) => mutate<{ ok: true }>(r, "Could not update notifications")),

  custodyConfig: () =>
    fetch("/api/custody/config", { cache: "no-store" }).then((r) => j<CustodyConfig>(r)),

  custodyAddress: (chain?: string) =>
    fetch(`/api/custody/address${chain ? `?chain=${encodeURIComponent(chain)}` : ""}`, {
      cache: "no-store",
    }).then((r) => mutate<DepositAddressInfo>(r, "Could not load your deposit address")),

  custodyHistory: () =>
    fetch("/api/custody/history", { cache: "no-store" }).then((r) => j<CustodyHistory>(r)),

  custodyWithdraw: (chain: string, symbol: string, amount: number, toAddress: string) =>
    fetch("/api/custody/withdraw", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chain, symbol, amount, toAddress }),
    }).then((r) => mutate<{ id: string; status: string }>(r, "Withdrawal failed")),

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
    triggerPrice?: number;
  }) =>
    fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => mutate<OrderResult>(r, "Could not place order")),

  openOrders: (pair?: string) =>
    fetch(`/api/orders${pair ? `?pair=${pair}` : ""}`, { cache: "no-store" }).then(
      (r) => j<{ orders: OrderResult[] }>(r),
    ),

  cancelOrder: (id: string) =>
    fetch(`/api/orders/${id}`, { method: "DELETE" }).then((r) =>
      mutate<OrderResult>(r, "Could not cancel order"),
    ),

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
    }).then((r) => mutate<SwapResult>(r, "Swap failed")),

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
    }).then((r) => mutate<RampResult>(r, "Payment failed")),

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
    }).then((r) => mutate<OtcResult>(r, "Settlement failed")),

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
    }).then((r) => mutate<P2POrder>(r, "Could not open trade")),

  p2pCreateAd: (input: CreateP2PAdInput) =>
    fetch("/api/p2p/ads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => mutate<P2PAd>(r, "Could not post ad")),

  p2pMyAds: () =>
    fetch("/api/p2p/ads/mine", { cache: "no-store" }).then((r) => j<{ ads: P2PMyAd[] }>(r)),

  p2pDeleteAd: (id: string) =>
    fetch(`/api/p2p/ads/${id}`, { method: "DELETE" }).then((r) =>
      mutate<{ ok: true }>(r, "Could not remove ad"),
    ),

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
    }).then((r) => mutate<P2POrder>(r, "Action failed")),

  p2pSendMessage: (id: string, text: string) =>
    fetch(`/api/p2p/orders/${id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    }).then((r) => mutate<P2POrder>(r, "Could not send")),

  // ---- KYC ----
  kyc: () => fetch("/api/kyc", { cache: "no-store" }).then((r) => mutate<KycInfo>(r, "Could not load")),

  kycSubmit: (input: { legalName: string; country: string; idNumber: string }) =>
    fetch("/api/kyc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => mutate<{ ok: true }>(r, "Submission failed")),

  // ---- Admin ----
  adminOverview: () =>
    fetch("/api/admin/data?view=overview", { cache: "no-store" }).then((r) => j<AdminOverview>(r)),
  adminUsers: () =>
    fetch("/api/admin/data?view=users", { cache: "no-store" }).then((r) =>
      j<{ users: AdminUser[] }>(r),
    ),
  adminDisputes: () =>
    fetch("/api/admin/data?view=disputes", { cache: "no-store" }).then((r) =>
      j<{ disputes: AdminDispute[] }>(r),
    ),
  adminLedger: () =>
    fetch("/api/admin/data?view=ledger", { cache: "no-store" }).then((r) =>
      j<{ rows: AdminLedgerRow[] }>(r),
    ),
  adminAds: () =>
    fetch("/api/admin/data?view=ads", { cache: "no-store" }).then((r) => j<{ ads: AdminAd[] }>(r)),

  adminAction: (body: AdminActionBody) =>
    fetch("/api/admin/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => mutate<{ ok: true }>(r, "Action failed")),
};
