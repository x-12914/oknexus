import "server-only";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { getOrCreateDepositAddress } from "@/lib/custody/addresses";
import { getChainAdapter, isChainEnabled } from "@/lib/custody/registry";
import { notify } from "@/lib/notifications";
import type { OnrampAsset, OnrampOrderView, OnrampProviderInfo, OnrampStatus } from "./types";
import { AlchemyPayProvider } from "./alchemy-pay";
import { OnramperProvider } from "./onramper";

/**
 * Fiat on-ramps: card, bank and mobile-money purchases delivered as crypto.
 *
 * The one design decision that matters: the provider sends the crypto to the
 * user's own OKNexus deposit address, on a chain our scanner already watches.
 * The balance is credited by the deposit scanner, exactly like any other
 * deposit, when the transfer is seen on-chain. Provider webhooks only update
 * the order's status for the user to see. So a provider can never credit a
 * balance by telling us it did; only the chain can, which means there is no
 * credit exposure to the provider and no money-printer if a webhook is forged.
 *
 * Every provider is dark until its keys are set and fails closed without them.
 */

export interface OnrampSessionInput {
  userId: string;
  email: string | null;
  fiatCode: string;
  fiatAmount?: number;
  asset: OnrampAsset;
  /** The user's deposit address on asset.chain. Locked in the provider flow. */
  address: string;
  /** Our order reference, echoed back by the provider's callback. */
  providerRef: string;
  redirectUrl: string;
  callbackUrl: string;
}

export interface OnrampWebhookEvent {
  providerRef?: string;
  externalId?: string;
  status: OnrampStatus;
  cryptoAmount?: number;
  fiatAmount?: number;
  txHash?: string;
}

export interface OnrampProvider {
  readonly id: string;
  readonly name: string;
  /** Shown under the button: what the user can pay with. */
  readonly methods: string;
  configured(): boolean;
  /** Assets the provider can deliver, tagged with our custody chain id. */
  assets(): OnrampAsset[];
  fiats(): string[];
  createSession(input: OnrampSessionInput): Promise<{ url: string; externalId?: string }>;
  /** Null when the signature does not verify. Never throws on bad input. */
  parseWebhook(rawBody: string, headers: Headers, path: string): OnrampWebhookEvent | null;
  /** What a verified webhook must be answered with, or the provider retries. */
  ack(): { body: string; contentType: string };
}

const PROVIDERS: OnrampProvider[] = [new AlchemyPayProvider(), new OnramperProvider()];

function appUrl(): string {
  return (process.env.AUTH_URL ?? process.env.APP_URL ?? "https://oknexusexchange.com").replace(/\/$/, "");
}

export function onrampProviders(): OnrampProvider[] {
  return PROVIDERS.filter((p) => p.configured());
}

export function onrampAvailable(): boolean {
  return onrampProviders().length > 0;
}

/**
 * Only assets our custody will actually credit: the chain is enabled and the
 * asset is its native coin or a configured token. A provider may well deliver
 * USDT on Tron; offering that would send money to an address we never scan.
 */
function deliverable(p: OnrampProvider): OnrampAsset[] {
  return p.assets().filter((a) => {
    if (!isChainEnabled(a.chain)) return false;
    const cfg = getChainAdapter(a.chain).config;
    return a.symbol === cfg.nativeSymbol || cfg.tokens.some((t) => t.symbol === a.symbol);
  });
}

export function listOnrampProviders(): OnrampProviderInfo[] {
  return onrampProviders()
    .map((p) => ({ id: p.id, name: p.name, assets: deliverable(p), fiats: p.fiats(), methods: p.methods }))
    .filter((p) => p.assets.length > 0);
}

export async function createOnrampSession(
  userId: string,
  providerId: string,
  input: { fiatCode: string; fiatAmount?: number; cryptoSymbol: string },
): Promise<{ url: string; orderId: string }> {
  const p = onrampProviders().find((x) => x.id === providerId);
  if (!p) throw new Error("That provider isn't available right now.");
  const symbol = input.cryptoSymbol.toUpperCase();
  const fiatCode = input.fiatCode.toUpperCase();
  const asset = deliverable(p).find((a) => a.symbol === symbol);
  if (!asset) throw new Error(`${symbol} can't be bought through ${p.name}.`);
  if (!p.fiats().includes(fiatCode)) throw new Error(`${p.name} doesn't accept ${fiatCode}.`);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const address = await getOrCreateDepositAddress(userId, asset.chain);
  // Short, URL-safe, unguessable. Providers cap reference length, so 16 chars.
  const providerRef = `okn${randomBytes(9).toString("base64url")}`;

  const order = await prisma.onrampOrder.create({
    data: {
      userId,
      provider: p.id,
      providerRef,
      fiatCode,
      fiatAmount: input.fiatAmount ?? null,
      cryptoSymbol: asset.symbol,
      chain: asset.chain,
      address,
      status: "CREATED",
    },
  });

  try {
    const s = await p.createSession({
      userId,
      email: user?.email ?? null,
      fiatCode,
      fiatAmount: input.fiatAmount,
      asset,
      address,
      providerRef,
      redirectUrl: `${appUrl()}/buy?order=${order.id}`,
      callbackUrl: `${appUrl()}/api/onramp/webhook/${p.id}`,
    });
    await prisma.onrampOrder.update({
      where: { id: order.id },
      data: { status: "PENDING", ...(s.externalId ? { externalId: s.externalId } : {}) },
    });
    return { url: s.url, orderId: order.id };
  } catch (e) {
    await prisma.onrampOrder.update({ where: { id: order.id }, data: { status: "FAILED" } });
    throw e;
  }
}

const TERMINAL = new Set<OnrampStatus>(["COMPLETED", "FAILED", "EXPIRED"]);

/**
 * Apply a provider callback. Unknown orders are acknowledged rather than
 * refused, so a stray or test callback does not make the provider retry for
 * hours; a bad signature is refused outright.
 */
export async function handleOnrampWebhook(
  providerId: string,
  rawBody: string,
  headers: Headers,
  path: string,
): Promise<{ status: number; body: string; contentType: string }> {
  const p = PROVIDERS.find((x) => x.id === providerId);
  if (!p || !p.configured()) return { status: 404, body: "unknown provider", contentType: "text/plain" };

  const evt = p.parseWebhook(rawBody, headers, path);
  if (!evt) {
    console.warn(`[onramp:${providerId}] webhook rejected: bad signature`);
    return { status: 401, body: "invalid signature", contentType: "text/plain" };
  }

  const order = evt.providerRef
    ? await prisma.onrampOrder.findUnique({ where: { providerRef: evt.providerRef } })
    : evt.externalId
      ? await prisma.onrampOrder.findFirst({ where: { provider: p.id, externalId: evt.externalId } })
      : null;
  if (!order) {
    console.warn(`[onramp:${providerId}] webhook for unknown order, acknowledged`);
    return { status: 200, ...p.ack() };
  }

  // A terminal state is final; a late or duplicate callback must not move an
  // order backwards.
  const stale = TERMINAL.has(order.status as OnrampStatus) && evt.status !== order.status;
  if (!stale) {
    await prisma.onrampOrder.update({
      where: { id: order.id },
      data: {
        status: evt.status,
        externalId: evt.externalId ?? order.externalId,
        cryptoAmount: evt.cryptoAmount ?? order.cryptoAmount,
        fiatAmount: evt.fiatAmount ?? order.fiatAmount,
        txHash: evt.txHash ?? order.txHash,
      },
    });
    if (evt.status === "COMPLETED" && order.status !== "COMPLETED") {
      await notify(order.userId, {
        type: "DEPOSIT",
        title: "Your purchase is on its way",
        body: `${p.name} has sent ${evt.cryptoAmount ?? ""} ${order.cryptoSymbol} to your wallet. It shows as a deposit once the network confirms it.`.replace(/\s+/g, " "),
        href: "/wallet",
      });
    } else if (evt.status === "FAILED" && order.status !== "FAILED") {
      await notify(order.userId, {
        type: "SYSTEM",
        title: "Purchase didn't go through",
        body: `${p.name} couldn't complete your ${order.cryptoSymbol} purchase. You haven't been charged for crypto that wasn't delivered.`,
        href: "/buy",
      });
    }
  }
  return { status: 200, ...p.ack() };
}

/**
 * Chase orders whose webhook never came. Alchemy Pay sends each webhook once
 * by default, so a dropped delivery would leave an order pending forever.
 * Providers without a status API are left to their webhooks; the deposit
 * scanner credits the money either way.
 */
export async function reconcileOnrampOrders(): Promise<{ checked: number; updated: number }> {
  const since = new Date(Date.now() - 48 * 3600 * 1000);
  const quiet = new Date(Date.now() - 15 * 60 * 1000);
  const rows = await prisma.onrampOrder.findMany({
    where: { status: { in: ["PENDING", "PAID"] }, createdAt: { gte: since }, updatedAt: { lte: quiet } },
    take: 50,
  });
  let updated = 0;
  for (const o of rows) {
    const p = PROVIDERS.find((x) => x.id === o.provider);
    if (!p || !p.configured() || !("queryStatus" in p)) continue;
    const query = (p as { queryStatus: (ref: string) => Promise<OnrampWebhookEvent | null> }).queryStatus;
    const evt = await query.call(p, o.providerRef).catch(() => null);
    if (!evt || evt.status === o.status) continue;
    await prisma.onrampOrder.update({
      where: { id: o.id },
      data: {
        status: evt.status,
        externalId: evt.externalId ?? o.externalId,
        cryptoAmount: evt.cryptoAmount ?? o.cryptoAmount,
        fiatAmount: evt.fiatAmount ?? o.fiatAmount,
        txHash: evt.txHash ?? o.txHash,
      },
    });
    updated++;
  }
  return { checked: rows.length, updated };
}

export async function listOnrampOrders(userId: string): Promise<OnrampOrderView[]> {
  const rows = await prisma.onrampOrder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    status: r.status as OnrampStatus,
    fiatCode: r.fiatCode,
    fiatAmount: r.fiatAmount != null ? Number(r.fiatAmount) : null,
    cryptoSymbol: r.cryptoSymbol,
    cryptoAmount: r.cryptoAmount != null ? Number(r.cryptoAmount) : null,
    txHash: r.txHash,
    createdAt: r.createdAt.getTime(),
  }));
}
