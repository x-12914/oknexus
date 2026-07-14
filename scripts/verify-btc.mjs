import puppeteer from "puppeteer-core";
import { execSync } from "node:child_process";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const KEY = `${process.env.USERPROFILE}\\.ssh\\oknexus_deploy_ed25519`;
const email = `btc_${Date.now()}@nexus.test`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cron = () => {
  try {
    execSync(`ssh -i "${KEY}" -o StrictHostKeyChecking=no opt@${IP} "bash /home/opt/oknexus/custody-cron.sh"`, {
      stdio: "ignore",
    });
  } catch {}
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", `--host-resolver-rules=MAP oknexusexchange.com ${IP}`, "--ignore-certificate-errors"],
  defaultViewport: { width: 1100, height: 800 },
});
const page = await browser.newPage();
const call = (m, p, b) =>
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
const sessionOk = async () => (await call("GET", "/api/wallet")).status === 200;
async function auth() {
  const n = await page.$('input[autocomplete="name"]');
  if (n) await n.type("BTC Bot");
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', "TestPass12345");
  await page.click('button[type="submit"]');
  await sleep(7000);
}
await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await auth();
if (!(await sessionOk())) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await auth();
}
console.log("session:", (await sessionOk()) ? "OK" : "FAILED");

// Config should now list all three chains.
const cfg = (await call("GET", "/api/custody/config")).json;
console.log("chains:", (cfg?.chains ?? []).map((c) => c.chain).join(", "));

// BTC deposit address (expect tb1…).
const addr = (await call("GET", "/api/custody/address?chain=bitcoin-testnet")).json;
console.log("BTC deposit address:", addr?.address);

const btc = async () => (await call("GET", "/api/wallet")).json?.items?.find((i) => i.symbol === "BTC");
console.log("BTC ledger before:", await btc());

// Withdraw to our own BTC address → hot wallet is empty, so this must lock,
// attempt broadcast, fail, and refund.
const wd = await call("POST", "/api/custody/withdraw", {
  chain: "bitcoin-testnet",
  symbol: "BTC",
  amount: 0.001,
  toAddress: addr.address,
});
console.log("withdraw request:", wd.status, JSON.stringify(wd.json));
console.log("BTC after request (expect 0.001 locked):", await btc());

for (let i = 0; i < 4; i++) {
  cron();
  await sleep(9000);
  const w = (await call("GET", "/api/custody/history")).json?.withdrawals?.find((x) => x.chain === "bitcoin-testnet");
  console.log(`[${i + 1}] withdraw=${w?.status ?? "-"} err=${w?.error ? w.error.slice(0, 40) : "-"}`);
  if (w?.status === "FAILED" || w?.status === "CONFIRMED") break;
}

console.log("\nBTC ledger after (expect refunded to original):", await btc());
await browser.close();
