import { sessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_CHAIN, getChainAdapter } from "@/lib/custody/registry";

export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ deposits: [], withdrawals: [] });

  const c = getChainAdapter(DEFAULT_CHAIN).config;
  const [deposits, withdrawals] = await Promise.all([
    prisma.deposit.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.withdrawal.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 25 }),
  ]);

  return Response.json({
    deposits: deposits.map((d) => ({
      id: d.id,
      symbol: d.symbol,
      amount: Number(d.amount),
      status: d.status,
      confirmations: d.confirmations,
      txHash: d.txHash,
      explorerUrl: c.explorerTxUrl(d.txHash),
      createdAt: d.createdAt.getTime(),
    })),
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      symbol: w.symbol,
      amount: Number(w.amount),
      status: w.status,
      toAddress: w.toAddress,
      txHash: w.txHash,
      explorerUrl: w.txHash ? c.explorerTxUrl(w.txHash) : null,
      error: w.error,
      createdAt: w.createdAt.getTime(),
    })),
  });
}
