import { getExchange } from "@/lib/exchange";

export interface MarketRow {
  symbol: string;
  base: string;
  quote: string;
  last: number;
  changePct24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

/**
 * Every market with its ticker, in one call.
 *
 * The markets page needs all of them at once; fetching a ticker per pair would
 * be N round trips from the browser. The connector caches tickers for a few
 * seconds, so batching here is close to free.
 */
export async function GET() {
  const ex = getExchange();
  const markets = await ex.listMarkets();

  const rows = await Promise.all(
    markets.map(async (m): Promise<MarketRow | null> => {
      try {
        const t = await ex.getTicker(m.symbol);
        return {
          symbol: m.symbol,
          base: m.base,
          quote: m.quote,
          last: t.last,
          changePct24h: t.changePct24h,
          volume24h: t.volume24h,
          high24h: t.high24h,
          low24h: t.low24h,
        };
      } catch {
        // One unreachable pair shouldn't blank the whole page.
        return null;
      }
    }),
  );

  return Response.json({ rows: rows.filter((r): r is MarketRow => r !== null) });
}
