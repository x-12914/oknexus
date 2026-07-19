import { getExchange } from "@/lib/exchange";

export async function GET() {
  const config = await getExchange().getOtcConfig();
  return Response.json(config);
}
