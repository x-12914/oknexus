import { getExchange } from "@/lib/exchange";

export async function GET() {
  const methods = await getExchange().listP2PPaymentMethods();
  return Response.json({ methods });
}
