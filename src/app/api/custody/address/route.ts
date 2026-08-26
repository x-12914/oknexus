import type { NextRequest } from "next/server";
import { sessionUserId } from "@/lib/auth";
import { DEFAULT_CHAIN, getChainAdapter, isChainEnabled } from "@/lib/custody/registry";
import { getOrCreateDepositAddress } from "@/lib/custody/addresses";

export async function GET(req: NextRequest) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  if (!process.env.CUSTODY_MNEMONIC) {
    return Response.json({ error: "Custody is not configured yet." }, { status: 503 });
  }
  const chain = req.nextUrl.searchParams.get("chain") || DEFAULT_CHAIN;
  // An adapter existing is not the same as the chain being served. Refuse
  // anything the scanner isn't watching, or we'd issue an address for funds
  // that could never be credited.
  if (!isChainEnabled(chain)) {
    return Response.json({ error: "Unsupported chain" }, { status: 400 });
  }
  let adapter;
  try {
    adapter = getChainAdapter(chain);
  } catch {
    return Response.json({ error: "Unsupported chain" }, { status: 400 });
  }
  const address = await getOrCreateDepositAddress(userId, chain);
  return Response.json({ chain, address, explorerUrl: adapter.config.explorerAddressUrl(address) });
}
