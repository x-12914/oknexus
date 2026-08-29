/**
 * Worked example of signing a request to the OKNexus API.
 *
 * Doubles as the end-to-end test for the signing implementation: if this
 * script gets a 200, the whole path works — header parsing, clock window,
 * secret decryption, signature comparison and scope checks.
 *
 *   OKN_KEY=okn_... OKN_SECRET=... node scripts/api-example.mjs [baseUrl]
 *
 * The signature covers timestamp + method + path + body. Every one of those is
 * included so none can be altered in flight: signing only the timestamp would
 * let someone keep a valid signature and change the order it applies to.
 */
import { createHmac } from "node:crypto";

const BASE = process.argv[2] ?? "https://oknexusexchange.com";
const KEY = process.env.OKN_KEY;
const SECRET = process.env.OKN_SECRET;

if (!KEY || !SECRET) {
  console.error("Set OKN_KEY and OKN_SECRET.");
  process.exit(1);
}

/**
 * `path` must include the query string exactly as sent — the server signs what
 * it receives, not a normalised version of it.
 */
async function call(method, path, body) {
  // Serialise once and both sign and send THIS string. Re-serialising for the
  // send risks a byte difference that invalidates the signature.
  const raw = body === undefined ? "" : JSON.stringify(body);
  const ts = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", SECRET)
    .update(`${ts}${method.toUpperCase()}${path}${raw}`)
    .digest("hex");

  const res = await fetch(BASE + path, {
    method,
    headers: {
      "X-OKN-KEY": KEY,
      "X-OKN-TIMESTAMP": ts,
      "X-OKN-SIGNATURE": signature,
      ...(raw ? { "content-type": "application/json" } : {}),
    },
    body: raw || undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

console.log(`base: ${BASE}\n`);

const account = await call("GET", "/api/v1/account");
console.log("GET /api/v1/account ->", account.status);
console.log(JSON.stringify(account.body, null, 2).slice(0, 500));

const orders = await call("GET", "/api/v1/orders");
console.log("\nGET /api/v1/orders ->", orders.status);
console.log(JSON.stringify(orders.body, null, 2).slice(0, 300));

// A deliberately corrupted signature must be rejected. If this returns 200 the
// verification is not actually running, which is worth failing loudly over.
{
  const ts = Math.floor(Date.now() / 1000).toString();
  const res = await fetch(BASE + "/api/v1/account", {
    headers: {
      "X-OKN-KEY": KEY,
      "X-OKN-TIMESTAMP": ts,
      "X-OKN-SIGNATURE": "0".repeat(64),
    },
  });
  console.log("\nbad signature ->", res.status, res.status === 401 ? "(rejected, correct)" : "SHOULD HAVE BEEN 401");
}

// An old timestamp must be rejected even with a valid signature, or a captured
// request could be replayed forever.
{
  const ts = (Math.floor(Date.now() / 1000) - 600).toString();
  const signature = createHmac("sha256", SECRET)
    .update(`${ts}GET/api/v1/account`)
    .digest("hex");
  const res = await fetch(BASE + "/api/v1/account", {
    headers: { "X-OKN-KEY": KEY, "X-OKN-TIMESTAMP": ts, "X-OKN-SIGNATURE": signature },
  });
  console.log("stale timestamp ->", res.status, res.status === 401 ? "(rejected, correct)" : "SHOULD HAVE BEEN 401");
}
