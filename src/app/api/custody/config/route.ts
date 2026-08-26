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
    // Priced live per chain, so the figure shown matches what will be charged.
    const withdrawFees: Record<string, number> = {};
    await Promise.all(
      chains.flatMap((c) =>
        c.assets.map(async (s) => {
          withdrawFees[s] = await withdrawFee(c.chain, s);
        }),
      ),
    );
    return Response.json({ configured, chains, withdrawFees });
  } catch {
    return Response.json({ configured: false, chains: [], withdrawFees: {} });
  }
}
