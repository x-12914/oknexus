// Bitnob credential + surface discovery probe.
//
// Auth is HMAC-SHA256 (X-Auth-Client / X-Auth-Timestamp / X-Auth-Nonce /
// X-Auth-Signature) against https://api.bitnob.com. Sandbox and production
// share the base URL and the client id — only the secret key differs, so the
// mode line below is sniffed off the key's colon prefix (e.g. `prd:live:…`).
//
// Run on the VPS:
//   cd /home/opt/oknexus && set -a && . ./.env && set +a && node scripts/verify-bitnob.mjs
// Add --quote to also request a payout quote (creates a quote; moves NO money).
import { createHmac, randomBytes } from "node:crypto";

const CLIENT_ID = process.env.BITNOB_CLIENT_ID;
const SECRET = process.env.BITNOB_SECRET_KEY ?? process.env.BITNOB_API_KEY;
const BASE = (process.env.BITNOB_API_BASE ?? "https://api.bitnob.com").replace(/\/$/, "");

if (!CLIENT_ID || !SECRET) {
  console.error("MISSING CREDENTIALS — set BITNOB_CLIENT_ID and BITNOB_SECRET_KEY in .env");
  process.exit(1);
}

// Hint only — /api/whoami below is the authoritative answer. Test markers beat
// live markers so an ambiguous key never gets mistaken for real money.
const lower = SECRET.toLowerCase();
const cut = lower.lastIndexOf(":");
const prefix = cut > 0 ? lower.slice(0, cut) : lower.slice(0, 12);
const mode = /(^|:)(test|sandbox|sbx|dev|stg)(:|$)/.test(prefix)
  ? "SANDBOX"
  : /(^|:)(live|prd|prod)(:|$)/.test(prefix)
    ? "LIVE (real money)"
    : "UNKNOWN (no live/test marker in the key prefix — is this the Client ID by mistake?)";

console.log(`BASE ${BASE}`);
console.log(`MODE ${mode}`);
console.log(`CLIENT_ID …${CLIENT_ID.slice(-6)}  SECRET …${SECRET.slice(-4)}\n`);

function headers(payload) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", SECRET)
    .update(`${CLIENT_ID}:${timestamp}:${nonce}:${payload}`)
    .digest("hex");
  return {
    "X-Auth-Client": CLIENT_ID,
    "X-Auth-Timestamp": timestamp,
    "X-Auth-Nonce": nonce,
    "X-Auth-Signature": signature,
    accept: "application/json",
    ...(payload ? { "content-type": "application/json" } : {}),
  };
}

async function probe(method, path, body) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  try {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: headers(payload),
      body: payload || undefined,
    });
    const t = await r.text();
    const flag = r.ok ? "OK " : r.status === 401 || r.status === 403 ? "AUTH" : "   ";
    console.log(`${flag} ${method} ${path} → ${r.status}  ${t.replace(/\s+/g, " ").slice(0, 240)}`);
    return r.ok;
  } catch (e) {
    console.log(`ERR ${method} ${path} → ${e.message}`);
    return false;
  }
}

// 1. Does the signature authenticate at all? Everything else is noise until this passes.
console.log("--- credentials ---");
await probe("GET", "/api/whoami");

// 2. Map the surface. Paths are candidates: a 404 tells us the route moved,
//    a 401/403 tells us it exists but our key lacks the feature.
console.log("\n--- wallets & rates ---");
await probe("GET", "/api/v1/wallets");
await probe("GET", "/api/v1/rates");

console.log("\n--- payouts / offramp (SELL crypto -> NGN bank) ---");
await probe("GET", "/api/v1/payouts/supported-countries");
await probe("GET", "/api/v1/payouts/institutions?countryCode=NG");
await probe("GET", "/api/v1/payouts");

console.log("\n--- customers & virtual accounts (BUY: NGN in -> credit crypto) ---");
await probe("GET", "/api/v1/customers");
await probe("GET", "/api/v1/virtualaccounts");
await probe("GET", "/api/v1/virtual-accounts");

console.log("\n--- transactions ---");
await probe("GET", "/api/v1/transactions");

if (process.argv.includes("--quote")) {
  console.log("\n--- payout quote (creates a quote, moves no money) ---");
  await probe("POST", "/api/v1/payouts/quotes", {
    source: "offchain",
    fromAsset: "usdt",
    toCurrency: "NGN",
    chain: "bsc",
    amount: 50,
  });
}

console.log("\nDone. Any 404 above = that path moved; re-check the API reference for the new one.");
