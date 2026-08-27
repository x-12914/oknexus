import { BinanceConnector } from "./binance-connector";
import { CoinGeckoConnector } from "./coingecko-connector";
import { MockExchangeConnector } from "./mock-connector";
import type { ExchangeConnector } from "./types";

let cached: ExchangeConnector | undefined;

export function getExchange(): ExchangeConnector {
  if (cached) return cached;
  // Binance by default. CoinGecko's demo tier allows 10,000 calls a MONTH, which
  // an 8-second price cache exhausts in under a day — so holding a CoinGecko key
  // is no longer reason enough to route prices through it. Opt in explicitly
  // with EXCHANGE_CONNECTOR=coingecko, and only on a paid tier.
  const id = process.env.EXCHANGE_CONNECTOR ?? "binance";
  switch (id) {
    case "mock":
      cached = new MockExchangeConnector();
      break;
    case "coingecko":
      cached = new CoinGeckoConnector();
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
