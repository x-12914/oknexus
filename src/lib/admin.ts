import { LedgerType, type KycStatus, type UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withLedger, credit, settleLocked, unlock } from "@/lib/ledger";
import type {
  AdminOverview,
  AdminUser,
  AdminDispute,
  AdminLedgerRow,
  AdminAd,
} from "@/lib/admin-types";

export async function getOverview(): Promise<AdminOverview> {
  const [
    users,
    suspended,
    pendingKyc,
    spotOrders,
    openOrders,
    p2pOrders,
    activeAds,
    disputes,
    swaps,
    ramps,
    otc,
    deposits,
    withdrawals,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { suspended: true } }),
    prisma.user.count({ where: { kycStatus: "PENDING" } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ["OPEN", "PARTIAL"] } } }),
    prisma.p2POrder.count(),
    prisma.p2PAd.count({ where: { active: true } }),
    prisma.p2POrder.count({ where: { status: "DISPUTED" } }),
    prisma.swapTx.count(),
    prisma.rampTx.count(),
    prisma.otcTrade.count(),
    prisma.deposit.count(),
    prisma.withdrawal.count(),
  ]);
  return {
    users,
    suspended,
    pendingKyc,
    spotOrders,
    openOrders,
    p2pOrders,
    activeAds,
    disputes,
    swaps,
    ramps,
    otc,
    deposits,
    withdrawals,
  };
}

export async function listUsers(): Promise<AdminUser[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      kycStatus: true,
      suspended: true,
      createdAt: true,
      kycLegalName: true,
      kycCountry: true,
      kycIdNumber: true,
    },
  });
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    kycStatus: u.kycStatus,
    suspended: u.suspended,
    createdAt: u.createdAt.getTime(),
    kycLegalName: u.kycLegalName,
    kycCountry: u.kycCountry,
    kycIdNumber: u.kycIdNumber,
  }));
}

export async function setUserSuspended(userId: string, suspended: boolean): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { suspended } });
}

export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { role } });
}

export async function setUserKyc(userId: string, status: KycStatus): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { kycStatus: status, kycReviewedAt: new Date() },
  });
}

export async function listDisputes(): Promise<AdminDispute[]> {
  const orders = await prisma.p2POrder.findMany({
    where: { status: "DISPUTED" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return orders.map((o) => ({
    id: o.id,
    asset: o.asset,
    assetAmount: Number(o.assetAmount),
    fiat: o.fiat,
    fiatAmount: Number(o.fiatAmount),
    buyerName: o.buyerName,
    sellerName: o.sellerName,
    twoParty: o.advertiserId != null,
    createdAt: o.createdAt.getTime(),
  }));
}

/** Admin escrow override: resolve a disputed P2P trade to the buyer or seller. */
export async function resolveDispute(
  orderId: string,
  resolution: "release" | "refund",
): Promise<void> {
  await withLedger(async (tx) => {
    const o = await tx.p2POrder.findUnique({ where: { id: orderId } });
    if (!o || o.status !== "DISPUTED") throw new Error("Not a disputed order");
    const amount = Number(o.assetAmount);
    const ref = { type: LedgerType.P2P, refId: o.id, memo: `P2P dispute ${resolution} ${o.asset}` };

    if (resolution === "release") {
      // Escrow to the buyer.
      if (o.takerRole === "seller") {
        await settleLocked(tx, o.userId, o.asset, amount, ref);
        if (o.advertiserId) await credit(tx, o.advertiserId, o.asset, amount, ref);
      } else {
        await credit(tx, o.userId, o.asset, amount, ref);
        if (o.advertiserId) await settleLocked(tx, o.advertiserId, o.asset, amount, ref);
      }
      await tx.p2POrder.update({
        where: { id: o.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          escrowLocked: false,
          messages: {
            create: {
              sender: "system",
              text: "A moderator resolved the dispute in the buyer's favour — escrow released.",
            },
          },
        },
      });
    } else {
      // Refund the seller.
      if (o.takerRole === "seller") {
        await unlock(tx, o.userId, o.asset, amount, ref);
      } else if (o.advertiserId) {
        const ad = await tx.p2PAd.findUnique({ where: { id: o.adId } });
        if (ad && ad.active) {
          await tx.p2PAd.update({ where: { id: ad.id }, data: { available: { increment: amount } } });
        } else {
          await unlock(tx, o.advertiserId, o.asset, amount, ref);
        }
      }
      await tx.p2POrder.update({
        where: { id: o.id },
        data: {
          status: "CANCELLED",
          escrowLocked: false,
          messages: {
            create: {
              sender: "system",
              text: "A moderator resolved the dispute in the seller's favour — escrow refunded.",
            },
          },
        },
      });
    }
  });
}

export async function listRecentLedger(limit = 60): Promise<AdminLedgerRow[]> {
  const rows = await prisma.ledgerEntry.findMany({
    where: { account: "AVAILABLE" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { email: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    userEmail: r.user.email,
    symbol: r.symbol,
    delta: Number(r.delta),
    type: r.type,
    memo: r.memo,
    createdAt: r.createdAt.getTime(),
  }));
}

export async function listAllAds(): Promise<AdminAd[]> {
  const ads = await prisma.p2PAd.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return ads.map((a) => ({
    id: a.id,
    advertiserId: a.advertiserId,
    merchantName: a.merchantName,
    side: a.side,
    asset: a.asset,
    fiat: a.fiat,
    price: Number(a.price),
    available: Number(a.available),
    active: a.active,
    createdAt: a.createdAt.getTime(),
  }));
}

/** Admin can pull any ad; returns a real advertiser's unreserved crypto. */
export async function adminDeactivateAd(adId: string): Promise<void> {
  await withLedger(async (tx) => {
    const a = await tx.p2PAd.findUnique({ where: { id: adId } });
    if (!a || !a.active) return;
    const remaining = Number(a.available);
    if (a.side === "SELL" && a.advertiserId && remaining > 0) {
      await unlock(tx, a.advertiserId, a.asset, remaining, {
        type: LedgerType.P2P,
        refId: a.id,
        memo: `P2P ad removed by admin ${a.asset}`,
      });
    }
    await tx.p2PAd.update({ where: { id: a.id }, data: { active: false, available: 0 } });
  });
}
