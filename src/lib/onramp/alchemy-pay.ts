import "server-only";
import crypto from "crypto";
import type { OnrampAsset, OnrampStatus } from "./types";
import type { OnrampProvider, OnrampSessionInput, OnrampWebhookEvent } from "./index";

/**
 * Alchemy Pay hosted on-ramp ("Page Integration").
 *
 * We build a signed URL to their hosted checkout with the asset, network,
 * amount and, crucially, the user's deposit address locked in. They take the
 * payment and send the crypto on-chain. Their webhook tells us how the order
 * went; the deposit scanner is what actually credits the balance.
 *
 * Signing, per their "Ramp Signature Description": HMAC-SHA256 with the app
 * secret over `timestamp + method + path + sortedQuery`, base64. The page
 * request path is fixed at /index/rampPageBuy even though the URL the user
 * opens is the site root. Webhooks sign `timestamp + POST + path +
 * sortedBodyJson` the same way, and carry it in `newSignature`.
 *
 * Dark until ALCHEMYPAY_APP_ID and ALCHEMYPAY_APP_SECRET are set.
 */
const PROD = { page: "https://ramp.alchemypay.org", api: "https://openapi.alchemypay.org" };
const TEST = { page: "https://ramptest.alchemypay.org", api: "https://openapi-test.alchemypay.org" };
const PAGE_SIGN_PATH = "/index/rampPageBuy";
const QUERY_PATH = "/open/api/v4/merchant/query/trade";

/** Their network codes for chains our custody serves. */
const NETWORK_FOR_CHAIN: Record<string, string> = {
  ethereum: "ETH",
  "ethereum-sepolia": "ETH",
  solana: "SOL",
  bitcoin: "BTC",
};

const STATUS: Record<string, OnrampStatus> = {
  PENDING: "PENDING",
  PAY_FAIL: "FAILED",
  PAY_SUCCESS: "PAID",
  TRANSFER: "PAID",
  FINISHED: "COMPLETED",
  CANCEL: "FAILED",
  RISK_CONTROL: "FAILED",
  REFUNDED: "FAILED",
};

function hosts() {
  return (process.env.ALCHEMYPAY_ENV ?? "production").toLowerCase() === "sandbox" ? TEST : PROD;
}

function sign(secret: string, content: string): string {
  return crypto.createHmac("sha256", secret).update(content, "utf8").digest("base64");
}

/** `key=value&...` in dictionary order, empties dropped, as their recipe requires. */
function sortedQuery(params: Record<string, string | number | undefined>): string {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "")
    .sort()
    .map((k) => `${k}=${String(params[k])}`)
    .join("&");
}

/** JSON of the body with empty values and the signature fields removed, keys sorted. */
function canonicalBody(body: Record<string, unknown>): string {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(body).sort()) {
    if (k === "signature" || k === "newSignature") continue;
    const v = body[k];
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return JSON.stringify(out);
}

export class AlchemyPayProvider implements OnrampProvider {
  readonly id = "alchemypay";
  readonly name = "Alchemy Pay";
  readonly methods = "Card, bank transfer, mobile money";

  configured(): boolean {
    return Boolean(process.env.ALCHEMYPAY_APP_ID && process.env.ALCHEMYPAY_APP_SECRET);
  }

  assets(): OnrampAsset[] {
    const out: OnrampAsset[] = [];
    for (const [chain, code] of Object.entries(NETWORK_FOR_CHAIN)) {
      const symbols = code === "ETH" ? ["ETH", "USDT", "USDC"] : code === "SOL" ? ["SOL", "USDT", "USDC"] : ["BTC"];
      for (const symbol of symbols) out.push({ symbol, chain, providerNetwork: code });
    }
    return out;
  }

  fiats(): string[] {
    // Their coverage table lives outside the docs; the list is configurable so
    // an unsupported currency can be dropped without a deploy.
    return (process.env.ALCHEMYPAY_FIATS ?? "NGN,USD,EUR,GBP").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  }

  async createSession(input: OnrampSessionInput): Promise<{ url: string }> {
    const appId = process.env.ALCHEMYPAY_APP_ID!;
    const secret = process.env.ALCHEMYPAY_APP_SECRET!;
    const timestamp = Date.now();
    const params = {
      appId,
      crypto: input.asset.symbol,
      network: input.asset.providerNetwork,
      fiat: input.fiatCode,
      fiatAmount: input.fiatAmount,
      address: input.address,
      merchantOrderNo: input.providerRef,
      callbackUrl: input.callbackUrl,
      redirectUrl: input.redirectUrl,
      email: input.email ?? undefined,
      showTable: "buy",
      type: "buy",
      timestamp,
    };
    const query = sortedQuery(params);
    const sig = sign(secret, `${timestamp}GET${PAGE_SIGN_PATH}?${query}`);
    return { url: `${hosts().page}/?${query}&sign=${encodeURIComponent(sig)}` };
  }

  parseWebhook(rawBody: string, headers: Headers, path: string): OnrampWebhookEvent | null {
    const secret = process.env.ALCHEMYPAY_APP_SECRET;
    const timestamp = headers.get("timestamp");
    if (!secret || !timestamp) return null;
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }
    const given = typeof body.newSignature === "string" ? body.newSignature : "";
    const expected = sign(secret, `${timestamp}POST${path}${canonicalBody(body)}`);
    const a = Buffer.from(expected);
    const b = Buffer.from(given);
    if (!given || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const status = STATUS[String(body.status ?? "").toUpperCase()];
    if (!status) return null;
    const num = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    return {
      providerRef: typeof body.merchantOrderNo === "string" ? body.merchantOrderNo : undefined,
      externalId: typeof body.orderNo === "string" ? body.orderNo : undefined,
      status,
      cryptoAmount: num(body.cryptoQuantity ?? body.cryptoAmount),
      fiatAmount: num(body.amount ?? body.fiatAmount),
      txHash: typeof body.txHash === "string" && body.txHash ? body.txHash : undefined,
    };
  }

  ack() {
    // Their retries stop on a 200 whose body says success.
    return { body: "success", contentType: "text/plain" };
  }

  /**
   * Ask them where an order stands. Used by the reconciler for orders whose
   * webhook never arrived; by default they send each webhook exactly once.
   */
  async queryStatus(providerRef: string): Promise<OnrampWebhookEvent | null> {
    const appId = process.env.ALCHEMYPAY_APP_ID;
    const secret = process.env.ALCHEMYPAY_APP_SECRET;
    if (!appId || !secret) return null;
    const timestamp = Date.now();
    const query = sortedQuery({ merchantOrderNo: providerRef, side: "BUY" });
    const sig = sign(secret, `${timestamp}GET${QUERY_PATH}?${query}`);
    const res = await fetch(`${hosts().api}${QUERY_PATH}?${query}`, {
      headers: { appid: appId, timestamp: String(timestamp), sign: sig },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: Record<string, unknown> };
    const d = json.data;
    if (!d) return null;
    const status = STATUS[String(d.status ?? "").toUpperCase()];
    if (!status) return null;
    const num = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    return {
      providerRef,
      externalId: typeof d.orderNo === "string" ? d.orderNo : undefined,
      status,
      cryptoAmount: num(d.cryptoAmount ?? d.cryptoQuantity),
      fiatAmount: num(d.fiatAmount ?? d.amount),
      txHash: typeof d.txHash === "string" && d.txHash ? d.txHash : undefined,
    };
  }
}
