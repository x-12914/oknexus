import { LedgerType, Prisma, type P2POrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getExchange } from "@/lib/exchange";
import { withLedger, lock, unlock, credit, settleLocked } from "@/lib/ledger";
import type {
  CreateP2POrderInput,
  P2PMerchant,
  P2PMessage,
  P2POrder,
  P2POrderAction,
} from "@/lib/exchange/types";

// DB-backed P2P trades with real escrow against the taker's wallet. The
// connector still supplies the (static) ad book + payment methods; order state,
// chat, and escrow live in Postgres + the ledger.
//
// Escrow model — the counterparty merchant is a simulated market maker, so we
// only move the *real* user's balance:
//   • taker is SELLER (ad side BUY)  → their crypto is LOCKED on create,
//     SETTLED out on release, or UNLOCKED on cancel.
//   • taker is BUYER  (ad side SELL) → merchant escrows (simulated); the taker
//     is CREDITED the crypto on release. Fiat moves off-ledger either way.

const PAYMENT_WINDOW_MIN = 15;

type DbP2POrder = Prisma.P2POrderGetPayload<{ include: { messages: true } }>;

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function toP2POrder(o: DbP2POrder): P2POrder {
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
    buyerName: o.buyerName,
    sellerName: o.sellerName,
    merchant: o.merchant as unknown as P2PMerchant,
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

export async function createP2POrder(input: CreateP2POrderInput): Promise<P2POrder> {
  const { userId, adId, fiatAmount, paymentMethod } = input;
  const ad = await getExchange().getP2PAd(adId);
  if (!ad) throw new Error("Advertisement not found");
  if (fiatAmount < ad.minLimit || fiatAmount > ad.maxLimit) {
    throw new Error(
      `Amount must be between ${ad.minLimit.toLocaleString()} and ${ad.maxLimit.toLocaleString()} ${ad.fiat}`,
    );
  }
  if (!ad.paymentMethods.includes(paymentMethod)) {
    throw new Error("Unsupported payment method for this ad");
  }
  const assetAmount = fiatAmount / ad.price;
  if (assetAmount > ad.available) throw new Error("Amount exceeds available liquidity");

  // Ad SELL → merchant sells, taker buys → taker is the buyer.
  // Ad BUY  → merchant buys, taker sells → taker is the seller.
  const takerRole: "buyer" | "seller" = ad.side === "SELL" ? "buyer" : "seller";
  const buyerName = takerRole === "buyer" ? "You" : ad.merchant.name;
  const sellerName = takerRole === "seller" ? "You" : ad.merchant.name;
  const methods = await getExchange().listP2PPaymentMethods();
  const methodName = methods.find((m) => m.id === paymentMethod)?.name ?? paymentMethod;

  return withLedger(async (tx) => {
    // Taker is selling: escrow their crypto now (fails if they don't hold it).
    if (takerRole === "seller") {
      await lock(tx, userId, ad.asset, assetAmount, {
        type: LedgerType.P2P,
        memo: `P2P escrow ${ad.asset}`,
      });
    }
    const created = await tx.p2POrder.create({
      data: {
        userId,
        adId,
        asset: ad.asset,
        fiat: ad.fiat,
        price: ad.price,
        assetAmount,
        fiatAmount,
        paymentMethod,
        status: "PENDING_PAYMENT",
        takerRole,
        buyerName,
        sellerName,
        merchantId: ad.merchant.id,
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
    return toP2POrder(created);
  });
}

export async function getP2POrder(userId: string, orderId: string): Promise<P2POrder | null> {
  const o = await prisma.p2POrder.findFirst({
    where: { id: orderId, userId },
    include: { messages: true },
  });
  return o ? toP2POrder(o) : null;
}

export async function listP2POrders(userId: string): Promise<P2POrder[]> {
  const orders = await prisma.p2POrder.findMany({
    where: { userId },
    include: { messages: true },
    orderBy: { createdAt: "desc" },
  });
  return orders.map(toP2POrder);
}

export async function actP2POrder(
  userId: string,
  orderId: string,
  action: P2POrderAction,
): Promise<P2POrder> {
  return withLedger(async (tx) => {
    const o = await tx.p2POrder.findFirst({ where: { id: orderId, userId } });
    if (!o) throw new Error("Order not found");
    const amount = Number(o.assetAmount);
    const ref = { type: LedgerType.P2P, refId: o.id, memo: `P2P ${action} ${o.asset}` };

    let status: P2POrderStatus;
    let sysText: string;

    switch (action) {
      case "MARK_PAID":
        if (o.status !== "PENDING_PAYMENT")
          throw new Error("Can only mark paid while awaiting payment");
        status = "PAID";
        sysText = `${o.buyerName} marked the payment as sent. Awaiting ${o.sellerName} to release escrow.`;
        break;
      case "RELEASE":
        if (o.status !== "PAID")
          throw new Error("Escrow can only be released after payment is marked");
        status = "COMPLETED";
        if (o.takerRole === "seller") {
          await settleLocked(tx, userId, o.asset, amount, ref); // crypto leaves the seller
        } else {
          await credit(tx, userId, o.asset, amount, ref); // crypto arrives to the buyer
        }
        sysText = `${o.sellerName} released ${fmt(amount)} ${o.asset} from escrow. Trade complete.`;
        break;
      case "CANCEL":
        if (o.status !== "PENDING_PAYMENT")
          throw new Error("Only unpaid orders can be cancelled");
        status = "CANCELLED";
        if (o.takerRole === "seller" && o.escrowLocked) {
          await unlock(tx, userId, o.asset, amount, ref); // return escrow to the seller
        }
        sysText = `Order cancelled. ${fmt(amount)} ${o.asset} returned to ${o.sellerName}.`;
        break;
      case "DISPUTE":
        if (o.status !== "PAID")
          throw new Error("Disputes can only be raised after payment is marked");
        status = "DISPUTED";
        sysText = "Dispute opened. A Nexus moderator will review the evidence and mediate.";
        break;
      default:
        throw new Error("Unknown action");
    }

    const updated = await tx.p2POrder.update({
      where: { id: o.id },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
        escrowLocked:
          status === "COMPLETED" || status === "CANCELLED" ? false : o.escrowLocked,
        messages: { create: { sender: "system", text: sysText } },
      },
      include: { messages: true },
    });
    return toP2POrder(updated);
  });
}

export async function sendP2PMessage(
  userId: string,
  orderId: string,
  text: string,
): Promise<P2POrder> {
  const o = await prisma.p2POrder.findFirst({ where: { id: orderId, userId } });
  if (!o) throw new Error("Order not found");
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Message is empty");
  // The demo user speaks as whichever side they took.
  await prisma.p2PMessage.create({
    data: { orderId: o.id, sender: o.takerRole, text: trimmed.slice(0, 500) },
  });
  const full = await prisma.p2POrder.findUniqueOrThrow({
    where: { id: o.id },
    include: { messages: true },
  });
  return toP2POrder(full);
}
