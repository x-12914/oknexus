import "server-only";
import crypto from "crypto";
import type { OnrampAsset, OnrampStatus } from "./types";
import type { OnrampProvider, OnrampSessionInput, OnrampWebhookEvent } from "./index";

/**
 * Onramper: an aggregator over many on-ramps (their choice of provider per
 * country and payment method), reached through a hosted widget.
 *
 * The widget URL carries the user's deposit address in `wallets`. With an
 * Ed25519 signing key registered with them (ONRAMPER_SIGNING_KEY_B64, the PEM
 * base64-encoded so it fits one env line) the address is signed and cannot be
 * changed inside the widget. Without the key the URL still pre-fills it,
 * which is a convenience rather than a guarantee, so the key is worth having.
 *
 * Webhooks are HMAC-SHA256 over the raw body with a webhook secret, in the
 * X-Onramper-Webhook-Signature header. Dark until ONRAMPER_API_KEY is set.
 */
const WIDGET = "https://buy.onramper.com/";
const SIG_PREFIX = "ONRAMPER-SIG-V2";
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

/** Their token ids for what our custody scans. */
const TOKEN_ID: Record<string, Record<string, string>> = {
  ethereum: { ETH: "eth", USDT: "usdt_ethereum", USDC: "usdc_ethereum" },
  solana: { SOL: "sol", USDT: "usdt_solana", USDC: "usdc_solana" },
  bitcoin: { BTC: "btc" },
};

const STATUS: Record<string, OnrampStatus> = {
  new: "PENDING",
  pending: "PENDING",
  paid: "PAID",
  completed: "COMPLETED",
  canceled: "FAILED",
  cancelled: "FAILED",
  failed: "FAILED",
};

function signingKey(): crypto.KeyObject | null {
  const b64 = process.env.ONRAMPER_SIGNING_KEY_B64;
  if (!b64) return null;
  try {
    return crypto.createPrivateKey(Buffer.from(b64, "base64").toString("utf8"));
  } catch {
    console.error("[onramp:onramper] ONRAMPER_SIGNING_KEY_B64 is not a readable PEM private key");
    return null;
  }
}

export class OnramperProvider implements OnrampProvider {
  readonly id = "onramper";
  readonly name = "Onramper";
  readonly methods = "Card, bank transfer, Apple Pay, mobile money";

  configured(): boolean {
    return Boolean(process.env.ONRAMPER_API_KEY);
  }

  assets(): OnrampAsset[] {
    const out: OnrampAsset[] = [];
    for (const [chain, map] of Object.entries(TOKEN_ID)) {
      for (const [symbol, id] of Object.entries(map)) out.push({ symbol, chain, providerNetwork: id });
    }
    return out;
  }

  fiats(): string[] {
    return (process.env.ONRAMPER_FIATS ?? "NGN,USD,EUR,GBP").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  }

  async createSession(input: OnrampSessionInput): Promise<{ url: string }> {
    const apiKey = process.env.ONRAMPER_API_KEY!;
    const tokenId = input.asset.providerNetwork;
    const params: Record<string, string> = {
      apiKey,
      mode: "buy",
      onlyCryptos: tokenId,
      defaultCrypto: tokenId,
      wallets: `${tokenId}:${input.address}`,
      defaultFiat: input.fiatCode,
      partnerContext: input.providerRef,
      successRedirectUrl: input.redirectUrl,
      failureRedirectUrl: input.redirectUrl,
    };
    if (input.fiatAmount) params.defaultAmount = String(input.fiatAmount);
    if (input.email) params.email = input.email;

    const key = signingKey();
    if (key) {
      // Canonical string per their V2 recipe: eight newline-joined lines, the
      // signed query sorted A-Z and encoded exactly as it will appear in the URL.
      const fields = ["apiKey", "partnerContext", "wallets"].sort();
      const signed = new URLSearchParams();
      for (const f of fields) signed.set(f, params[f]);
      const timestamp = new Date().toISOString();
      const nonce = crypto.randomUUID();
      const canonical = [SIG_PREFIX, timestamp, nonce, "GET", "/", signed.toString(), "", EMPTY_SHA256].join("\n");
      const sig = crypto.sign(null, Buffer.from(canonical, "utf8"), key).toString("base64");
      params.sigV2 = `v2:${sig}`;
      params.sigV2Timestamp = timestamp;
      params.sigV2Nonce = nonce;
      params.sigV2Fields = fields.join(",");
    }
    return { url: `${WIDGET}?${new URLSearchParams(params).toString()}` };
  }

  parseWebhook(rawBody: string, headers: Headers): OnrampWebhookEvent | null {
    const secret = process.env.ONRAMPER_WEBHOOK_SECRET;
    const given = headers.get("x-onramper-webhook-signature") ?? "";
    if (!secret || !given) return null;
    const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(given.toLowerCase());
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }
    const status = STATUS[String(body.status ?? "").toLowerCase()];
    if (!status) return null;
    const num = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    return {
      providerRef: typeof body.partnerContext === "string" ? body.partnerContext : undefined,
      externalId: typeof body.transactionId === "string" ? body.transactionId : undefined,
      status,
      cryptoAmount: num(body.outAmount),
      fiatAmount: num(body.inAmount),
      txHash: typeof body.transactionHash === "string" && body.transactionHash ? body.transactionHash : undefined,
    };
  }

  ack() {
    return { body: "ok", contentType: "text/plain" };
  }
}
