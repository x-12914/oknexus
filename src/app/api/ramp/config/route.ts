import { getExchange } from "@/lib/exchange";
import { simulatedRampEnabled } from "@/lib/ramp/flags";

export async function GET() {
  // Empty rather than 503: callers just render nothing.
  if (!simulatedRampEnabled()) {
    return Response.json({ currencies: [], methods: [] });
  }
  const ex = getExchange();
  const [currencies, methods] = await Promise.all([
    ex.listFiatCurrencies(),
    ex.listRampPaymentMethods(),
  ]);
  return Response.json({ currencies, methods });
}
