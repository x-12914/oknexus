import { getExchange } from "@/lib/exchange";

export async function GET() {
  const markets = await getExchange().listMarkets();
  return Response.json({ markets });
}
