import { LedgerType, Prisma, type P2POrderStatus, type P2PAd as P2PAdRow } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getExchange } from "@/lib/exchange";
import { withLedger, lock, unlock, credit, settleLocked } from "@/lib/ledger";
import { ensureP2PAds, demoAdsEnabled } from "@/lib/p2p-seed";
import type {
  CreateP2POrderInput,
  OrderSide,
  P2PAd,
  P2PAdFilter,
  P2PMerchant,
  P2PMessage,
  P2POrder,
  P2POrderAction,
} from "@/lib/exchange/types";
import { getMerchantStatsFor, withRealStats, asHouseMerchant } from "@/lib/p2p-reputation";
import { quantize } from "@/lib/ledger";
import { P2P_PCT } from "@/lib/fees";

// DB-backed P2P: house-liquidity ads + user-created ads share one table, with
// real two-sided escrow. When a real advertiser's ad is taken, both wallets move
// (advertiser's crypto ↔ taker's crypto); mock ads (advertiserId null) only touch
// the taker's wallet. Fiat always moves off-ledger.

const PAYMENT_WINDOW_MIN = 15;

type DbP2POrder = Prisma.P2POrderGetPayload<{ include: { messages: true } }>;
type DbAd = P2PAdRow;

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function toAd(a: DbAd): P2PAd {
  return {
    id: a.id,
    side: a.side,
    asset: a.asset,
    fiat: a.fiat,
    price: Number(a.price),
    available: Number(a.available),
    minLimit: Number(a.minLimit),
    maxLimit: Number(a.maxLimit),
    paymentMethods: a.paymentMethods,
    terms: a.terms ?? undefined,
    merchant: a.merchant as unknown as P2PMerchant,
  };
}

function toP2POrder(o: DbP2POrder, viewerId: string): P2POrder {
  const viewerRole: "buyer" | "seller" | undefined =
    o.userId === viewerId
      ? (o.takerRole as "buyer" | "seller")
      : o.advertiserId === viewerId
        ? o.takerRole === "buyer"
          ? "seller"
          : "buyer"
        : undefined;
  return {
    id: o.id,
    adId: o.adId,
    asset: o.asset,
    fiat: o.fiat,
    price: Number(o.price),
    assetAmount: Number(o.assetAmount),
    fiatAmount: Number(o.fiatAmount),
    paymentMethod: o.paymentMethod,
    status: o.status,
    takerRole: o.takerRole as "buyer" | "seller",
    viewerRole,
    twoParty: o.advertiserId != null,
    buyerName: o.buyerName,
    sellerName: o.sellerName,
    merchant: o.merchant as unknown as P2PMerchant,
    fee: Number(o.fee),
    paymentWindowMinutes: o.paymentWindowMinutes,
    createdAt: o.createdAt.getTime(),
    expiresAt: o.expiresAt.getTime(),
    completedAt: o.completedAt?.getTime(),
    messages: o.messages
      .slice()
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(
        (m): P2PMessage => ({
          id: m.id,
          sender: m.sender as P2PMessage["sender"],
          text: m.text,
          timestamp: m.createdAt.getTime(),
        }),
      ),
  };
}

// ---- Ads (the marketplace book) ----

export async function listAds(viewerId: string | null, filter?: P2PAdFilter): Promise<P2PAd[]> {
  await ensureP2PAds();
  const where: Prisma.P2PAdWhereInput = {
    active: true,
    available: { gt: 0 },
    // Belt and braces with the create-time check: unbacked ads are not listed
    // either, so they cannot be reached even by a stale ad id.
    ...(demoAdsEnabled() ? {} : { advertiserId: { not: null } }),
    ...(filter?.side ? { side: filter.side } : {}),
    ...(filter?.asset ? { asset: filter.asset } : {}),
    ...(filter?.fiat ? { fiat: filter.fiat } : {}),
    ...(filter?.paymentMethod ? { paymentMethods: { has: filter.paymentMethod } } : {}),
    // Don't show a user their own ads in the taker book.
    ...(viewerId ? { NOT: { advertiserId: viewerId } } : {}),
  };
  const rows = await prisma.p2PAd.findMany({ where });

  // Reputation is computed from real orders, not read from the snapshot stored
  // on the ad. One batched query for the whole page rather than one per ad.
  const stats = await getMerchantStatsFor(rows.map((r) => r.advertiserId));
  const ads = rows.map((r) => {
    const ad = toAd(r);
    if (r.advertiserId) {
      const s = stats.get(r.advertiserId);
      return s ? { ...ad, merchant: withRealStats(ad.merchant, s) } : ad;
    }
    // House ads seeded before this change still carry invented identities and
    // histories in their stored blob. Normalising here rather than migrating
    // means an old row can never resurface a fake track record.
    return { ...ad, merchant: asHouseMerchant(ad.merchant) };
  });

  // Best price first: taker buying (ad SELL) wants low; taker selling wants high.
  ads.sort((a, b) => (a.side === "SELL" ? a.price - b.price : b.price - a.price));
  return ads;
}

export interface MyAd extends P2PAd {
  active: boolean;
}

export async function listMyAds(userId: string): Promise<MyAd[]> {
  const rows = await prisma.p2PAd.findMany({
    where: { advertiserId: userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({ ...toAd(r), active: r.active }));
}

export interface CreateAdInput {
  side: OrderSide;
  asset: string;
  fiat: string;
  price: number;
  available: number;
  minLimit: number;
  maxLimit: number;
  paymentMethods: string[];
  terms?: string;
}

export async function createAd(userId: string, input: CreateAdInput): Promise<P2PAd> {
  if (!(input.price > 0)) throw new Error("Price must be positive");
  if (!(input.available > 0)) throw new Error("Amount must be positive");
  if (!(input.minLimit > 0) || input.maxLimit < input.minLimit) {
    throw new Error("Enter a valid min/max order range");
  }
  if (input.paymentMethods.length === 0) throw new Error("Pick at least one payment method");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const displayName = user?.name || user?.email?.split("@")[0] || "Trader";
  const merchant: P2PMerchant = {
    id: userId,
    name: displayName,
    online: true,
    // Placeholder only: listP2PAds overlays live figures computed from real
    // orders, so this snapshot is never what a user actually sees.
    completedTrades: 0,
    completionRatePct: null,
    avgReleaseMinutes: null,
    isNew: true,
    verified: false,
  };

  return withLedger(async (tx) => {
    // A sell ad escrows the advertiser's crypto up front (their inventory).
    if (input.side === "SELL") {
      await lock(tx, userId, input.asset, input.available, {
        type: LedgerType.P2P,
        memo: `P2P ad escrow ${input.asset}`,
      });
    }
    const row = await tx.p2PAd.create({
      data: {
        advertiserId: userId,
        side: input.side,
        asset: input.asset,
        fiat: input.fiat,
        price: input.price,
        available: input.available,
        minLimit: input.minLimit,
        maxLimit: input.maxLimit,
        paymentMethods: input.paymentMethods,
        terms: input.terms?.trim() || null,
        merchantName: displayName,
        merchant: merchant as unknown as Prisma.InputJsonValue,
      },
    });
    return toAd(row);
  });
}

export async function deleteAd(userId: string, adId: string): Promise<void> {
  await withLedger(async (tx) => {
    const a = await tx.p2PAd.findFirst({ where: { id: adId, advertiserId: userId } });
    if (!a) throw new Error("Ad not found");
    if (!a.active) return;
    const remaining = Number(a.available);
    // Return the still-open (unreserved) inventory for sell ads.
    if (a.side === "SELL" && remaining > 0) {
      await unlock(tx, userId, a.asset, remaining, {
        type: LedgerType.P2P,
        refId: a.id,
        memo: `P2P ad closed ${a.asset}`,
      });
    }
    await tx.p2PAd.update({ where: { id: a.id }, data: { active: false, available: 0 } });
  });
}

// ---- Orders (taking an ad) ----

export async function createP2POrder(input: CreateP2POrderInput): Promise<P2POrder> {
  const { userId, adId, fiatAmount, paymentMethod } = input;
  await ensureP2PAds();
  const methods = await getExchange().listP2PPaymentMethods();
  const methodName = methods.find((m) => m.id === paymentMethod)?.name ?? paymentMethod;

  return withLedger(async (tx) => {
    const ad = await tx.p2PAd.findUnique({ where: { id: adId } });
    if (!ad || !ad.active) throw new Error("Advertisement not found");
    if (ad.advertiserId === userId) throw new Error("You can't take your own ad");
    // No advertiser means no counterparty and no escrow behind the crypto. Such
    // an ad can only be a leftover demo row, and trading against it would credit
    // a buyer from nothing.
    if (!ad.advertiserId && !demoAdsEnabled()) {
      throw new Error("Advertisement not found");
    }

    const price = Number(ad.price);
    if (fiatAmount < Number(ad.minLimit) || fiatAmount > Number(ad.maxLimit)) {
      throw new Error(
        `Amount must be between ${Number(ad.minLimit).toLocaleString()} and ${Number(ad.maxLimit).toLocaleString()} ${ad.fiat}`,
      );
    }
    if (!ad.paymentMethods.includes(paymentMethod)) {
      throw new Error("Unsupported payment method for this ad");
    }
    const assetAmount = fiatAmount / price;
    if (assetAmount > Number(ad.available)) throw new Error("Amount exceeds available liquidity");

    const takerRole: "buyer" | "seller" = ad.side === "SELL" ? "buyer" : "seller";
    const merchant = ad.merchant as unknown as P2PMerchant;
    // Store real display names so both parties (taker + a real advertiser) see
    // correct labels; the UI substitutes "You" via viewerRole.
    const taker = await tx.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const takerName = taker?.name || taker?.email?.split("@")[0] || "Taker";
    const buyerName = takerRole === "buyer" ? takerName : merchant.name;
    const sellerName = takerRole === "seller" ? takerName : merchant.name;

    if (takerRole === "seller") {
      // Taker is selling → escrow the taker's crypto now.
      await lock(tx, userId, ad.asset, assetAmount, {
        type: LedgerType.P2P,
        memo: `P2P escrow ${ad.asset}`,
      });
    } else {
      // Taker is buying → reserve it out of the ad's inventory. For a real
      // advertiser that crypto is already locked (from posting the ad).
      await tx.p2PAd.update({
        where: { id: ad.id },
        data: { available: { decrement: assetAmount } },
      });
    }

    const created = await tx.p2POrder.create({
      data: {
        userId,
        advertiserId: ad.advertiserId,
        adId: ad.id,
        asset: ad.asset,
        fiat: ad.fiat,
        price,
        assetAmount,
        fiatAmount,
        paymentMethod,
        status: "PENDING_PAYMENT",
        takerRole,
        buyerName,
        sellerName,
        merchantId: merchant.id,
        merchant: ad.merchant as unknown as Prisma.InputJsonValue,
        paymentWindowMinutes: PAYMENT_WINDOW_MIN,
        escrowLocked: takerRole === "seller",
        expiresAt: new Date(Date.now() + PAYMENT_WINDOW_MIN * 60_000),
        messages: {
          create: {
            sender: "system",
            text: `Escrow locked ${fmt(assetAmount)} ${ad.asset}. ${buyerName} to pay ${fiatAmount.toLocaleString()} ${ad.fiat} via ${methodName} within ${PAYMENT_WINDOW_MIN} minutes.`,
          },
        },
      },
      include: { messages: true },
    });
    return toP2POrder(created, userId);
  });
}

// A user is party to an order as either the taker or the ad's advertiser.
const partyTo = (userId: string) => ({ OR: [{ userId }, { advertiserId: userId }] });

export async function getP2POrder(userId: string, orderId: string): Promise<P2POrder | null> {
  const o = await prisma.p2POrder.findFirst({
    where: { id: orderId, ...partyTo(userId) },
    include: { messages: true },
  });
  return o ? toP2POrder(o, userId) : null;
}

export async function listP2POrders(userId: string): Promise<P2POrder[]> {
  const orders = await prisma.p2POrder.findMany({
    where: partyTo(userId),
    include: { messages: true },
    orderBy: { createdAt: "desc" },
  });
  return orders.map((o) => toP2POrder(o, userId));
}

export async function actP2POrder(
  userId: string,
  orderId: string,
  action: P2POrderAction,
): Promise<P2POrder> {
  return withLedger(async (tx) => {
    const o = await tx.p2POrder.findFirst({ where: { id: orderId, ...partyTo(userId) } });
    if (!o) throw new Error("Order not found");
    const amount = Number(o.assetAmount);
    const ref = { type: LedgerType.P2P, refId: o.id, memo: `P2P ${action} ${o.asset}` };

    // The actor's role in this order.
    //
    // Enforcement used to be skipped when the ad had no advertiser, so that the
    // demo ads could be driven from one side. That exemption was the hole: with
    // no advertiser, RELEASE credits the buyer and settles nothing, so a taker
    // who could call both MARK_PAID and RELEASE minted crypto out of nothing.
    // Roles are now enforced for every order without exception.
    const isAdvertiser = o.advertiserId === userId && o.userId !== userId;
    const actorRole: "buyer" | "seller" = isAdvertiser
      ? o.takerRole === "buyer"
        ? "seller"
        : "buyer"
      : (o.takerRole as "buyer" | "seller");
    const requireRole = (role: "buyer" | "seller") => {
      if (actorRole !== role) throw new Error(`Only the ${role} can do this.`);
    };

    let status: P2POrderStatus;
    let sysText: string;
    // Recorded on the order so P2P revenue is auditable rather than implied by
    // the gap between what left escrow and what the buyer received.
    let p2pFee = 0;

    switch (action) {
      case "MARK_PAID":
        if (o.status !== "PENDING_PAYMENT")
          throw new Error("Can only mark paid while awaiting payment");
        requireRole("buyer");
        status = "PAID";
        sysText = `${o.buyerName} marked the payment as sent. Awaiting ${o.sellerName} to release escrow.`;
        break;
      case "RELEASE":
        if (o.status !== "PAID")
          throw new Error("Escrow can only be released after payment is marked");
        requireRole("seller");
        // Mirrors the guard in resolveDispute. Both branches below pair a
        // credit with a settleLocked; without an advertiser one leg silently
        // vanishes and the trade mints. Unreachable now that unbacked ads
        // cannot be taken, but the invariant belongs next to the settlement.
        if (!o.advertiserId) {
          throw new Error("This order has no counterparty and cannot be settled.");
        }
        status = "COMPLETED";
        // Settle against the actual parties (o.userId = taker), NOT the actor —
        // either party may trigger the release.
        // The fee comes out of the buyer's proceeds, the same way spot takes its
        // cut from the asset received. The seller's escrow still leaves in full,
        // so the difference is the platform's — it covers escrow and dispute
        // handling rather than being pure margin.
        p2pFee = quantize(amount * P2P_PCT);
        const netToBuyer = quantize(amount - p2pFee);
        if (o.takerRole === "seller") {
          await settleLocked(tx, o.userId, o.asset, amount, ref); // taker's escrow leaves
          if (o.advertiserId) await credit(tx, o.advertiserId, o.asset, netToBuyer, ref); // advertiser receives
        } else {
          await credit(tx, o.userId, o.asset, netToBuyer, ref); // taker receives
          if (o.advertiserId) await settleLocked(tx, o.advertiserId, o.asset, amount, ref); // advertiser's escrow leaves
        }
        sysText = `${o.sellerName} released ${fmt(amount)} ${o.asset} from escrow. Trade complete.`;
        break;
      case "CANCEL":
        if (o.status !== "PENDING_PAYMENT")
          throw new Error("Only unpaid orders can be cancelled");
        status = "CANCELLED";
        if (o.takerRole === "seller" && o.escrowLocked) {
          await unlock(tx, o.userId, o.asset, amount, ref); // return taker's escrow
        } else if (o.takerRole === "buyer") {
          const ad = await tx.p2PAd.findUnique({ where: { id: o.adId } });
          if (o.advertiserId && ad && !ad.active) {
            // The ad was closed meanwhile — hand the reserved crypto back.
            await unlock(tx, o.advertiserId, o.asset, amount, ref);
          } else {
            await tx.p2PAd.updateMany({ where: { id: o.adId }, data: { available: { increment: amount } } });
          }
        }
        sysText = `Order cancelled. ${fmt(amount)} ${o.asset} returned to ${o.sellerName}.`;
        break;
      case "DISPUTE":
        if (o.status !== "PAID")
          throw new Error("Disputes can only be raised after payment is marked");
        status = "DISPUTED";
        sysText = "Dispute opened. A OKNexus moderator will review the evidence and mediate.";
        break;
      default:
        throw new Error("Unknown action");
    }

    const updated = await tx.p2POrder.update({
      where: { id: o.id },
      data: {
        status,
        fee: p2pFee,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
        escrowLocked:
          status === "COMPLETED" || status === "CANCELLED" ? false : o.escrowLocked,
        messages: { create: { sender: "system", text: sysText } },
      },
      include: { messages: true },
    });
    return toP2POrder(updated, userId);
  });
}

export async function sendP2PMessage(
  userId: string,
  orderId: string,
  text: string,
): Promise<P2POrder> {
  const o = await prisma.p2POrder.findFirst({ where: { id: orderId, ...partyTo(userId) } });
  if (!o) throw new Error("Order not found");
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Message is empty");
  const isAdvertiser = o.advertiserId === userId && o.userId !== userId;
  const senderRole = isAdvertiser
    ? o.takerRole === "buyer"
      ? "seller"
      : "buyer"
    : o.takerRole;
  await prisma.p2PMessage.create({
    data: { orderId: o.id, sender: senderRole, text: trimmed.slice(0, 500) },
  });
  const full = await prisma.p2POrder.findUniqueOrThrow({
    where: { id: o.id },
    include: { messages: true },
  });
  return toP2POrder(full, userId);
}
