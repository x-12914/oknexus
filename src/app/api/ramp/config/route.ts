import { getExchange } from "@/lib/exchange";

export async function GET() {
  const ex = getExchange();
  const [currencies, methods] = await Promise.all([
    ex.listFiatCurrencies(),
    ex.listRampPaymentMethods(),
  ]);
  return Response.json({ currencies, methods });
}
