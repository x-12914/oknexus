import { getExchange } from "@/lib/exchange";

export async function GET() {
  const assets = await getExchange().listSwapAssets();
  return Response.json({ assets });
}
