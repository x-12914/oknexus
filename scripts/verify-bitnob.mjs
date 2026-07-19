// Probes the Bitnob sandbox to confirm the key authenticates and to learn the exact
// endpoint shapes from live responses. Run on the VPS:
//   cd /home/opt/oknexus && set -a && . ./.env && set +a && node scripts/verify-bitnob.mjs
const KEY = process.env.BITNOB_API_KEY;
const BASE =
  process.env.BITNOB_API_BASE?.replace(/\/$/, "") ||
  (process.env.BITNOB_ENV === "live"
    ? "https://api.bitnob.co/api/v1"
    : "https://sandboxapi.bitnob.co/api/v1");

if (!KEY) {
  console.error("MISSING BITNOB_API_KEY");
  process.exit(1);
}
console.log("BASE", BASE, "| ENV", process.env.BITNOB_ENV ?? "(unset→sandbox)");

const H = { Authorization: `Bearer ${KEY}`, "content-type": "application/json" };

async function probe(method, path, body) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: H,
      body: body ? JSON.stringify(body) : undefined,
    });
    const t = await r.text();
    console.log(`${method} ${path} → ${r.status}  ${t.replace(/\s+/g, " ").slice(0, 220)}`);
  } catch (e) {
    console.log(`${method} ${path} → ERR ${e.message}`);
  }
}

// Read-only discovery probes (order picked from Bitnob's documented surface).
await probe("GET", "/wallets");
await probe("GET", "/rates");
await probe("GET", "/payouts/supported-countries");
await probe("GET", "/payouts/countries");
await probe("GET", "/payouts/institutions?countryCode=NG");
await probe("GET", "/payouts/banks?countryCode=NG");
await probe("POST", "/payouts/quotes", {
  source: "offchain",
  fromAsset: "usdt",
  toCurrency: "NGN",
  chain: "bsc",
  amount: 50,
});
