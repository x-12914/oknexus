import { reconcileAll } from "@/lib/custody/reconcile";
import { chainLabel } from "@/lib/custody/registry";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Public proof of reserves.
 *
 * Deliberately a live reconciliation rather than a stored "verified on <date>"
 * badge. A date is a claim about the past that nobody can check; this reads
 * every address we control on every enabled chain, sums what the ledger says we
 * owe, and reports both — so the number is true at the moment it is read or it
 * is not published at all.
 *
 * It is NOT a third-party attestation, and the page says so. Calling an
 * automated self-check an audit is the kind of claim that reads fine until a
 * regulator asks who performed it.
 */
export async function GET() {
  try {
    const r = await reconcileAll();
    return Response.json({
      generatedAt: Date.now(),
      method: "live-reconciliation",
      attested: false,
      chainsChecked: r.assets.length > 0 ? [...new Set(r.assets.map((a) => a.chain))] : [],
      fullyBacked: r.shortfalls.length === 0,
      assets: r.assets.map((a) => ({
        chain: a.chain,
        chainLabel: chainLabel(a.chain),
        symbol: a.symbol,
        heldOnChain: a.heldOnChain,
        owedToUsers: a.owedToUsers,
        coverage: a.coverage,
        addressesChecked: a.addressesChecked,
        fullyBacked: !a.shortfall,
      })),
    });
  } catch (e) {
    // Never publish a reassuring number we could not compute.
    return Response.json(
      { error: "Reserves could not be verified right now.", detail: (e as Error).message },
      { status: 503 },
    );
  }
}
