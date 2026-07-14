import { listChains, chainLabel } from "@/lib/custody/registry";

export async function GET() {
  const configured = !!process.env.CUSTODY_MNEMONIC;
  try {
    const chains = listChains().map((c) => ({
      chain: c.chain,
      label: chainLabel(c.chain),
      nativeSymbol: c.nativeSymbol,
      minConfirmations: c.minConfirmations,
      assets: [c.nativeSymbol, ...c.tokens.map((t) => t.symbol)],
    }));
    return Response.json({ configured, chains });
  } catch {
    return Response.json({ configured: false, chains: [] });
  }
}
