import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
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

async function launchUser(email) {
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
    if (n) await n.type("P2P Tester");
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
  return { browser, call };
}

const btc = (w) => {
  const i = w?.json?.items?.find((x) => x.symbol === "BTC");
  return i ? `avail ${i.balance} / locked ${i.locked}` : "?";
};

const A = await launchUser(`pa_${Date.now()}@nexus.test`);
const B = await launchUser(`pb_${Date.now()}@nexus.test`);

console.log("A BTC before:", btc(await A.call("GET", "/api/wallet")));

// A posts a SELL BTC ad → escrow-locks 0.02 BTC.
const ad = await A.call("POST", "/api/p2p/ads", {
  side: "SELL", asset: "BTC", fiat: "USD", price: 62000,
  available: 0.02, minLimit: 100, maxLimit: 1000, paymentMethods: ["bank"],
});
console.log("A posts ad:", ad.status, ad.json?.id);
console.log("A BTC after post (expect locked 0.02):", btc(await A.call("GET", "/api/wallet")));

// A should NOT see their own ad in the taker book; B should.
const aSees = (await A.call("GET", "/api/p2p/ads?side=SELL&asset=BTC&fiat=USD")).json?.ads ?? [];
const bList = (await B.call("GET", "/api/p2p/ads?side=SELL&asset=BTC&fiat=USD")).json?.ads ?? [];
console.log("A sees own ad? (expect false):", aSees.some((x) => x.id === ad.json.id));
console.log("B sees A's ad?  (expect true): ", bList.some((x) => x.id === ad.json.id));

// B takes 620 USD (= 0.01 BTC).
const order = await B.call("POST", "/api/p2p/orders", {
  adId: ad.json.id, fiatAmount: 620, paymentMethod: "bank",
});
console.log("B takes ad:", order.status, "amount", order.json?.assetAmount, order.json?.id);
console.log("B BTC after take:", btc(await B.call("GET", "/api/wallet")));

// B marks paid, then (demo) simulates A releasing escrow.
await B.call("POST", `/api/p2p/orders/${order.json.id}/action`, { action: "MARK_PAID" });
const rel = await B.call("POST", `/api/p2p/orders/${order.json.id}/action`, { action: "RELEASE" });
console.log("release:", rel.status, rel.json?.status);

console.log("\nA BTC final (expect avail 0.03 / locked 0.01):", btc(await A.call("GET", "/api/wallet")));
console.log("B BTC final (expect avail 0.06 / locked 0):   ", btc(await B.call("GET", "/api/wallet")));

await A.browser.close();
await B.browser.close();
