import puppeteer from "puppeteer-core";
import { execSync } from "node:child_process";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const email = `verify_${Date.now()}@nexus.test`;
const password = "TestPass12345";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    `--host-resolver-rules=MAP oknexusexchange.com ${IP}`,
    "--ignore-certificate-errors",
  ],
  defaultViewport: { width: 1200, height: 800 },
});
const page = await browser.newPage();

// Register → AuthForm auto signs in and redirects to /trade/BTC-USDT.
await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "Verify Bot");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', password);
await page.click('button[type="submit"]');
await sleep(6000);

// Call the API from the authenticated page context (session cookie included).
const call = (method, path, body) =>
  page.evaluate(
    async (m, p, b) => {
      const res = await fetch(p, {
        method: m,
        headers: b ? { "content-type": "application/json" } : undefined,
        body: b ? JSON.stringify(b) : undefined,
        cache: "no-store",
      });
      let json = null;
      try {
        json = await res.json();
      } catch {}
      return { status: res.status, json };
    },
    method,
    path,
    body,
  );

const pick = (w, syms) =>
  (w?.json?.items ?? [])
    .filter((i) => syms.includes(i.symbol))
    .map((i) => `${i.symbol}: ${i.balance}${i.locked ? ` (+${i.locked} locked)` : ""}`);
const log = (label, v) => console.log(`\n== ${label} ==`, v);

const w0 = await call("GET", "/api/wallet");
log("wallet initial total", w0.json?.totalUsd);

// Swap 1000 USDT -> BTC
const q = await call("POST", "/api/swap/quote", { from: "USDT", to: "BTC", amount: 1000 });
const sx = await call("POST", "/api/swap/execute", { quoteId: q.json?.quoteId });
log("swap execute status", `${sx.status} ${sx.json?.toAmount ?? sx.json?.error}`);
log("balances after swap", pick(await call("GET", "/api/wallet"), ["USDT", "BTC"]));

// Spot MARKET buy 0.01 BTC
const so = await call("POST", "/api/orders", {
  pair: "BTC-USDT",
  side: "BUY",
  type: "MARKET",
  quantity: 0.01,
});
log("spot market order", `${so.status} ${so.json?.status ?? so.json?.error} @ ${so.json?.avgFillPrice ?? "-"}`);
log("balances after spot", pick(await call("GET", "/api/wallet"), ["USDT", "BTC"]));

// Resting LIMIT buy far below market -> should rest OPEN and lock 500 USDT
const lo = await call("POST", "/api/orders", {
  pair: "BTC-USDT",
  side: "BUY",
  type: "LIMIT",
  quantity: 0.01,
  price: 50000,
});
log("resting limit order", `${lo.status} ${lo.json?.status ?? lo.json?.error}`);
log("balances with lock", pick(await call("GET", "/api/wallet"), ["USDT"]));
const oo = await call("GET", "/api/orders?pair=BTC-USDT");
log("open orders count", oo.json?.orders?.length);

// Ramp BUY $500 via card -> credit BTC
const rq = await call("POST", "/api/ramp/quote", {
  side: "BUY",
  fiatCode: "USD",
  cryptoSymbol: "BTC",
  paymentMethodId: "card",
  amount: 500,
});
const rx = await call("POST", "/api/ramp/execute", { quoteId: rq.json?.quoteId });
log("ramp execute", `${rx.status} ${rx.json?.status ?? rx.json?.error} +${rx.json?.cryptoAmount ?? "-"} BTC`);

// Overspend guard
const bad = await call("POST", "/api/swap/quote", { from: "USDT", to: "BTC", amount: 999999 });
const badx = await call("POST", "/api/swap/execute", { quoteId: bad.json?.quoteId });
log("overspend swap (expect 400)", `${badx.status} ${badx.json?.error}`);

const tx = await call("GET", "/api/transactions");
log("activity entries", tx.json?.activity?.length);
log("activity sample", (tx.json?.activity ?? []).slice(0, 5).map((a) => `${a.type} ${a.delta > 0 ? "+" : ""}${a.delta} ${a.symbol}`));

// ---- Persistence proof: restart PM2, then re-read the same session ----
console.log("\n-- restarting PM2 on the VPS (proves state is in Postgres, not memory) --");
execSync(
  `ssh -i "${process.env.USERPROFILE}\\.ssh\\oknexus_deploy_ed25519" -o StrictHostKeyChecking=no opt@${IP} "pm2 restart oknexus"`,
  { stdio: "inherit" },
);
await sleep(9000);

log("wallet total AFTER restart", (await call("GET", "/api/wallet")).json?.totalUsd);
log("open orders AFTER restart", (await call("GET", "/api/orders?pair=BTC-USDT")).json?.orders?.length);

console.log("\nVERIFY EMAIL:", email);
await browser.close();
