import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getChainAdapter, EVM_CHAIN } from "./registry";
import { turnkeyConfigured, createEvmWallet } from "@/lib/turnkey";

/**
 * The user's deposit address for a chain, deriving + persisting one on first use.
 *
 * Two custody backends:
 *  - **Turnkey** (when configured, EVM chain): each user gets a Turnkey wallet; the
 *    address comes from Turnkey's secure signer (keys never touch our servers).
 *  - **Self-built HD** (fallback / non-EVM): sequential HD derivation from the custody
 *    seed via `ChainState.nextIndex` (index 0 reserved for the hot wallet).
 *
 * Either way the row is unique per (userId, chain) and per (chain, derivationIndex);
 * retries on the rare concurrent-allocation collision.
 */
export async function getOrCreateDepositAddress(userId: string, chain: string): Promise<string> {
  const adapter = getChainAdapter(chain); // also validates the chain

  if (turnkeyConfigured() && chain === EVM_CHAIN) {
    return getOrCreateTurnkeyEvmAddress(userId, chain);
  }

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

/**
 * EVM deposit address backed by Turnkey. The wallet is created via Turnkey's API
 * (async, outside the DB transaction) and then persisted; `derivationIndex` is kept
 * only to satisfy the (chain, derivationIndex) uniqueness — it is not an HD path here.
 */
async function getOrCreateTurnkeyEvmAddress(userId: string, chain: string): Promise<string> {
  const existing = await prisma.depositAddress.findUnique({
    where: { userId_chain: { userId, chain } },
    select: { address: true },
  });
  if (existing) return existing.address;

  const { address } = await createEvmWallet(`oknexus:${chain}:${userId}`);

  for (let attempt = 0; attempt < 4; attempt++) {
    // Re-check in case a concurrent request already persisted this user's address.
    const again = await prisma.depositAddress.findUnique({
      where: { userId_chain: { userId, chain } },
      select: { address: true },
    });
    if (again) return again.address;

    try {
      const created = await prisma.$transaction(async (tx) => {
        const state = await tx.chainState.upsert({
          where: { chain },
          update: {},
          create: { chain },
          select: { nextIndex: true },
        });
        const rec = await tx.depositAddress.create({
          data: { userId, chain, address, derivationIndex: state.nextIndex },
        });
        await tx.chainState.update({ where: { chain }, data: { nextIndex: state.nextIndex + 1 } });
        return rec;
      });
      return created.address;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  throw new Error("Could not allocate a Turnkey deposit address");
}
