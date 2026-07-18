import { listChains, chainLabel } from "@/lib/custody/registry";
import { withdrawFee } from "@/lib/custody/withdrawals";
import { turnkeyConfigured } from "@/lib/turnkey";

export async function GET() {
  const configured = turnkeyConfigured() || !!process.env.CUSTODY_MNEMONIC;
  try {
    const chains = listChains().map((c) => ({
      chain: c.chain,
      label: chainLabel(c.chain),
      nativeSymbol: c.nativeSymbol,
      minConfirmations: c.minConfirmations,
      assets: [c.nativeSymbol, ...c.tokens.map((t) => t.symbol)],
    }));
    const withdrawFees: Record<string, number> = {};
    for (const c of chains) for (const s of c.assets) withdrawFees[s] = withdrawFee(s);
    return Response.json({ configured, chains, withdrawFees });
  } catch {
    return Response.json({ configured: false, chains: [], withdrawFees: {} });
  }
}
