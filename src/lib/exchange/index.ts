import { BinanceConnector } from "./binance-connector";
import { CoinGeckoConnector } from "./coingecko-connector";
import { MockExchangeConnector } from "./mock-connector";
import type { ExchangeConnector } from "./types";

let cached: ExchangeConnector | undefined;

export function getExchange(): ExchangeConnector {
  if (cached) return cached;
  // Prices from CoinGecko when its key is set (order book/tape/candles still from
  // Binance, with a mock fallback). Override with EXCHANGE_CONNECTOR=mock|binance|coingecko.
  const id =
    process.env.EXCHANGE_CONNECTOR ?? (process.env.COINGECKO_API_KEY ? "coingecko" : "binance");
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
