import { DEFAULT_CHAIN, getChainAdapter } from "@/lib/custody/registry";

export async function GET() {
  const configured = !!process.env.CUSTODY_MNEMONIC && !!process.env.EVM_RPC_URL;
  try {
    const c = getChainAdapter(DEFAULT_CHAIN).config;
    return Response.json({
      chain: c.chain,
      nativeSymbol: c.nativeSymbol,
      minConfirmations: c.minConfirmations,
      assets: [c.nativeSymbol, ...c.tokens.map((t) => t.symbol)],
      configured,
    });
  } catch {
    return Response.json({
      chain: DEFAULT_CHAIN,
      nativeSymbol: "ETH",
      minConfirmations: 3,
      assets: [],
      configured: false,
    });
  }
}
