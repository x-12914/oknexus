import { BinanceConnector } from "./binance-connector";
import { KrakenConnector } from "./kraken-connector";
import { CoinGeckoConnector } from "./coingecko-connector";
import { MockExchangeConnector } from "./mock-connector";
import type { ExchangeConnector } from "./types";

let cached: ExchangeConnector | undefined;

export function getExchange(): ExchangeConnector {
  if (cached) return cached;
  // Kraken by default.
  //
  // Binance answers our servers with HTTP 451 — geo-blocked by region — so it
  // silently supplied nothing while CoinGecko covered prices and the order
  // book, trade tape and candles fell through to generated data. Kraken
  // answers, with a real book.
  //
  // CoinGecko's demo tier allows 10,000 calls a MONTH, which an 8-second price
  // cache exhausts in under a day, so holding a key is not reason enough to
  // route prices through it. Opt in explicitly, and only on a paid tier.
  const id = process.env.EXCHANGE_CONNECTOR ?? "kraken";
  switch (id) {
    case "mock":
      cached = new MockExchangeConnector();
      break;
    case "coingecko":
      cached = new CoinGeckoConnector();
      break;
    case "binance":
      cached = new BinanceConnector();
      break;
    case "kraken":
    case "real":
    default:
      cached = new KrakenConnector();
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
