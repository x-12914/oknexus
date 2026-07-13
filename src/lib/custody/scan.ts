import { LedgerType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withLedger, credit } from "@/lib/ledger";
import { getChainAdapter } from "./registry";

// Max blocks scanned per pass — bounds RPC work; the cursor catches up over
// successive passes if we fall behind.
const MAX_RANGE = BigInt(30);

export interface ScanResult {
  found: number;
  credited: number;
  from: string;
  to: string;
  tip: string;
}

/**
 * One deposit-scanning pass for a chain: find new transfers to user addresses,
 * record them PENDING, then credit the ledger for any that have reached the
 * confirmation threshold. Idempotent — safe to run on a short interval.
 */
export async function scanChain(chain: string): Promise<ScanResult> {
  const adapter = getChainAdapter(chain);
  const minConf = adapter.config.minConfirmations;
  const tip = await adapter.getBlockNumber();

  const addrs = await prisma.depositAddress.findMany({
    where: { chain },
    select: { address: true, userId: true },
  });
  const addrToUser = new Map(addrs.map((a) => [a.address.toLowerCase(), a.userId]));
  const watched = addrs.map((a) => a.address);

  // Scan window. On first ever run, start at the tip (don't rescan history).
  const state = await prisma.chainState.upsert({
    where: { chain },
    update: {},
    create: { chain },
    select: { lastScannedBlock: true },
  });
  let fromBlock = state.lastScannedBlock === BigInt(0) ? tip : state.lastScannedBlock + BigInt(1);
  if (fromBlock > tip) fromBlock = tip;
  const toBlock = fromBlock + MAX_RANGE > tip ? tip : fromBlock + MAX_RANGE;

  let found = 0;
  if (watched.length > 0) {
    const deposits = await adapter.scanDeposits(watched, fromBlock, toBlock);
    for (const d of deposits) {
      const userId = addrToUser.get(d.address.toLowerCase());
      if (!userId) continue;
      const confirmations = Number(tip - d.blockNumber) + 1;
      try {
        await prisma.deposit.create({
          data: {
            userId,
            chain,
            symbol: d.symbol,
            amount: d.amount,
            address: d.address,
            txHash: d.txHash,
            blockNumber: d.blockNumber,
            confirmations,
            status: "PENDING",
          },
        });
        found++;
      } catch (e) {
        // Already recorded (unique chain+txHash+symbol) — confirmations update below.
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }
  }

  await prisma.chainState.update({ where: { chain }, data: { lastScannedBlock: toBlock } });

  // Mature PENDING deposits → credit once confirmed. Guarded updateMany makes the
  // credit exactly-once even if two passes overlap.
  let credited = 0;
  const pendings = await prisma.deposit.findMany({
    where: { chain, status: "PENDING" },
    take: 50,
  });
  for (const d of pendings) {
    const confirmations = Number(tip - d.blockNumber) + 1;
    if (confirmations >= minConf) {
      await withLedger(async (tx) => {
        const upd = await tx.deposit.updateMany({
          where: { id: d.id, status: "PENDING" },
          data: { status: "CREDITED", confirmations, creditedAt: new Date() },
        });
        if (upd.count === 0) return;
        await credit(tx, d.userId, d.symbol, Number(d.amount), {
          type: LedgerType.DEPOSIT,
          refId: d.id,
          memo: `Deposit ${d.symbol}`,
        });
      });
      credited++;
    } else {
      await prisma.deposit.update({ where: { id: d.id }, data: { confirmations } });
    }
  }

  return {
    found,
    credited,
    from: fromBlock.toString(),
    to: toBlock.toString(),
    tip: tip.toString(),
  };
}
