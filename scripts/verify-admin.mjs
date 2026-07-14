import puppeteer from "puppeteer-core";
import { execSync } from "node:child_process";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const KEY = `${process.env.USERPROFILE}\\.ssh\\oknexus_deploy_ed25519`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function mkCall(page) {
  return (m, p, b) =>
    page.evaluate(
      async (m, p, b) => {
        const r = await fetch(p, {
          method: m,
          headers: b ? { "content-type": "application/json" } : undefined,
          body: b ? JSON.stringify(b) : undefined,
          cache: "no-store",
        });
        let j = null;
        try {
          j = await r.json();
        } catch {}
        return { status: r.status, json: j };
      },
      m,
      p,
      b,
    );
}

async function launchUser(name) {
  const email = `${name}_${Date.now()}@nexus.test`;
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", `--host-resolver-rules=MAP oknexusexchange.com ${IP}`, "--ignore-certificate-errors"],
    defaultViewport: { width: 1100, height: 800 },
  });
  const page = await browser.newPage();
  const call = mkCall(page);
  const auth = async () => {
    const n = await page.$('input[autocomplete="name"]');
    if (n) await n.type(name);
    await page.type('input[type="email"]', email);
    await page.type('input[type="password"]', "TestPass12345");
    await page.click('button[type="submit"]');
    await sleep(7000);
  };
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
  await auth();
  if ((await call("GET", "/api/wallet")).status !== 200) {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
    await auth();
  }
  return { browser, page, call, email, auth };
}

const btc = async (call) => {
  const i = (await call("GET", "/api/wallet")).json?.items?.find((x) => x.symbol === "BTC");
  return i ? `avail ${i.balance} / locked ${i.locked}` : "?";
};

const admin = await launchUser("admin");
const A = await launchUser("adv");
const B = await launchUser("tak");
console.log("registered admin/A/B");

// Promote admin, then re-login for a fresh JWT carrying the ADMIN role.
execSync(`scp -i "${KEY}" -o StrictHostKeyChecking=no scripts/promote.mjs opt@${IP}:/home/opt/oknexus/promote.mjs`, { stdio: "ignore" });
execSync(
  `ssh -i "${KEY}" -o StrictHostKeyChecking=no opt@${IP} "cd /home/opt/oknexus && set -a && . ./.env && set +a && node promote.mjs '${admin.email}' && rm promote.mjs"`,
  { stdio: "inherit" },
);
const cdp = await admin.page.createCDPSession();
await cdp.send("Network.clearBrowserCookies");
await admin.page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
await admin.auth();
console.log("admin re-logged in (role refresh):", (await admin.call("GET", "/api/wallet")).status);

console.log("\n===== Two-party P2P =====");
console.log("A BTC before:", await btc(A.call));
const ad = await A.call("POST", "/api/p2p/ads", {
  side: "SELL", asset: "BTC", fiat: "USD", price: 60000,
  available: 0.02, minLimit: 100, maxLimit: 1200, paymentMethods: ["bank"],
});
console.log("A posts ad:", ad.status, "→ A BTC:", await btc(A.call));
const order = await B.call("POST", "/api/p2p/orders", { adId: ad.json.id, fiatAmount: 600, paymentMethod: "bank" });
console.log("B takes 0.01:", order.status);
const mp = await B.call("POST", `/api/p2p/orders/${order.json.id}/action`, { action: "MARK_PAID" });
console.log("B (buyer) mark paid:", mp.status, mp.json?.status);
const badRel = await B.call("POST", `/api/p2p/orders/${order.json.id}/action`, { action: "RELEASE" });
console.log("B (buyer) RELEASE — expect BLOCKED:", badRel.status, badRel.json?.error);
const aOrders = (await A.call("GET", "/api/p2p/orders")).json?.orders ?? [];
const aView = aOrders.find((o) => o.id === order.json.id);
console.log("A sees order in My Trades:", !!aView, "· viewerRole:", aView?.viewerRole);
const rel = await A.call("POST", `/api/p2p/orders/${order.json.id}/action`, { action: "RELEASE" });
console.log("A (seller) RELEASE — expect success:", rel.status, rel.json?.status);
console.log("A BTC final:", await btc(A.call), "· B BTC final:", await btc(B.call));

console.log("\n===== Admin =====");
const ov = await admin.call("GET", "/api/admin/data?view=overview");
console.log("admin overview:", ov.status, "users:", ov.json?.users, "p2pOrders:", ov.json?.p2pOrders);
await B.call("POST", "/api/kyc", { legalName: "Test User", country: "Nigeria", idNumber: "A1234567" });
console.log("B KYC after submit:", (await B.call("GET", "/api/kyc")).json?.status);
const users = (await admin.call("GET", "/api/admin/data?view=users")).json?.users ?? [];
const bUser = users.find((u) => u.email === B.email);
console.log("admin sees B KYC:", bUser?.kycStatus);
const appr = await admin.call("POST", "/api/admin/action", { type: "kyc", userId: bUser.id, value: "APPROVED" });
console.log("admin approve KYC:", appr.status);
console.log("B KYC after approval:", (await B.call("GET", "/api/kyc")).json?.status);
const forbidden = await A.call("GET", "/api/admin/data?view=overview");
console.log("A (non-admin) admin access — expect 403:", forbidden.status);

await admin.browser.close();
await A.browser.close();
await B.browser.close();
