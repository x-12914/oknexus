import { sessionUserId } from "@/lib/auth";
import { getPortfolio } from "@/lib/wallet";

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) {
    return Response.json({ error: "Please sign in." }, { status: 401 });
  }
  const portfolio = await getPortfolio(userId);
  return Response.json(portfolio);
}
