import type { NextRequest } from "next/server";
import { authenticateApiRequest, apiAuthError } from "@/lib/api-auth";
import { getPortfolio } from "@/lib/wallet";

/** Balances. Available to any valid key — reading is the default scope. */
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiAuthError(auth);

  const p = await getPortfolio(auth.userId);
  return Response.json({
    balances: p.items.map((h) => ({
      symbol: h.symbol,
      available: h.balance,
      locked: h.locked,
      usdValue: h.usdValue,
    })),
    totalUsd: p.totalUsd,
  });
}
