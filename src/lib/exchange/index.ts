import { BinanceConnector } from "./binance-connector";
import { MockExchangeConnector } from "./mock-connector";
import type { ExchangeConnector } from "./types";

let cached: ExchangeConnector | undefined;

export function getExchange(): ExchangeConnector {
  if (cached) return cached;
  // Defaults to live Binance market data (with automatic mock fallback if the
  // API is unreachable/geo-blocked). Set EXCHANGE_CONNECTOR=mock to force mock.
  const id = process.env.EXCHANGE_CONNECTOR ?? "binance";
  switch (id) {
    case "mock":
      cached = new MockExchangeConnector();
      break;
    case "binance":
    case "real":
    default:
      cached = new BinanceConnector();
  }
  return cached;
}

export type {
  ExchangeConnector,
  MarketInfo,
  Ticker,
  OrderBookSnapshot,
  OrderBookLevel,
  RecentTrade,
  Candle,
  CandleInterval,
  OrderResult,
  OrderSide,
  OrderType,
  OrderStatus,
  PlaceOrderInput,
  SwapAsset,
  SwapQuote,
  SwapResult,
  RampSide,
  FiatCurrency,
  RampPaymentMethod,
  RampQuoteInput,
  RampQuote,
  RampResult,
  OtcTier,
  OtcConfig,
  OtcQuoteInput,
  OtcQuote,
  OtcResult,
  P2PMerchant,
  P2PPaymentMethod,
  P2PAd,
  P2PAdFilter,
  P2POrder,
  P2POrderStatus,
  P2POrderAction,
  P2PMessage,
  P2PParty,
  CreateP2POrderInput,
} from "./types";
