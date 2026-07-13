import { sessionUserId } from "@/lib/auth";
import { DEFAULT_CHAIN, getChainAdapter } from "@/lib/custody/registry";
import { getOrCreateDepositAddress } from "@/lib/custody/addresses";

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  if (!process.env.CUSTODY_MNEMONIC || !process.env.EVM_RPC_URL) {
    return Response.json({ error: "Custody is not configured yet." }, { status: 503 });
  }
  const address = await getOrCreateDepositAddress(userId, DEFAULT_CHAIN);
  const c = getChainAdapter(DEFAULT_CHAIN).config;
  return Response.json({ chain: c.chain, address, explorerUrl: c.explorerAddressUrl(address) });
}
