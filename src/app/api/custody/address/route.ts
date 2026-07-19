import type { NextRequest } from "next/server";
import { sessionUserId } from "@/lib/auth";
import { DEFAULT_CHAIN, getChainAdapter } from "@/lib/custody/registry";
import { getOrCreateDepositAddress } from "@/lib/custody/addresses";

export async function GET(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  if (!process.env.CUSTODY_MNEMONIC) {
    return Response.json({ error: "Custody is not configured yet." }, { status: 503 });
  }
  const chain = req.nextUrl.searchParams.get("chain") || DEFAULT_CHAIN;
  let adapter;
  try {
    adapter = getChainAdapter(chain);
  } catch {
    return Response.json({ error: "Unsupported chain" }, { status: 400 });
  }
  const address = await getOrCreateDepositAddress(userId, chain);
  return Response.json({ chain, address, explorerUrl: adapter.config.explorerAddressUrl(address) });
}
