import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getChainAdapter } from "./registry";

/**
 * The user's deposit address for a chain, deriving + persisting one on first
 * use. HD indices are handed out sequentially via ChainState.nextIndex (index 0
 * is reserved for the hot wallet). Retries on the rare concurrent-allocation
 * collision (two new users racing for the same index).
 */
export async function getOrCreateDepositAddress(userId: string, chain: string): Promise<string> {
  const adapter = getChainAdapter(chain); // also validates the chain

  for (let attempt = 0; attempt < 4; attempt++) {
    const existing = await prisma.depositAddress.findUnique({
      where: { userId_chain: { userId, chain } },
      select: { address: true },
    });
    if (existing) return existing.address;

    try {
      const created = await prisma.$transaction(async (tx) => {
        const state = await tx.chainState.upsert({
          where: { chain },
          update: {},
          create: { chain },
          select: { nextIndex: true },
        });
        const index = state.nextIndex;
        const address = adapter.deriveAddress(index);
        const rec = await tx.depositAddress.create({
          data: { userId, chain, address, derivationIndex: index },
        });
        await tx.chainState.update({ where: { chain }, data: { nextIndex: index + 1 } });
        return rec;
      });
      return created.address;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  throw new Error("Could not allocate a deposit address");
}
