import { sessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getChainAdapter } from "@/lib/custody/registry";

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ deposits: [], withdrawals: [] });

  const [deposits, withdrawals] = await Promise.all([
    prisma.deposit.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.withdrawal.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  const cfg = (chain: string) => {
    try {
      return getChainAdapter(chain).config;
    } catch {
      return null;
    }
  };

  return Response.json({
    deposits: deposits.map((d) => {
      const c = cfg(d.chain);
      return {
        id: d.id,
        chain: d.chain,
        symbol: d.symbol,
        amount: Number(d.amount),
        status: d.status,
        confirmations: d.confirmations,
        txHash: d.txHash,
        explorerUrl: c ? c.explorerTxUrl(d.txHash) : "",
        createdAt: d.createdAt.getTime(),
      };
    }),
    withdrawals: withdrawals.map((w) => {
      const c = cfg(w.chain);
      return {
        id: w.id,
        chain: w.chain,
        symbol: w.symbol,
        amount: Number(w.amount),
        status: w.status,
        toAddress: w.toAddress,
        txHash: w.txHash,
        explorerUrl: w.txHash && c ? c.explorerTxUrl(w.txHash) : null,
        error: w.error,
        createdAt: w.createdAt.getTime(),
      };
    }),
  });
}
