import puppeteer from "puppeteer-core";
import { execSync } from "node:child_process";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const KEY = `${process.env.USERPROFILE}\\.ssh\\oknexus_deploy_ed25519`;
const email = `v2_${Date.now()}@nexus.test`;
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
await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "Custody Bot");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', password);
await page.click('button[type="submit"]');
await sleep(6000);

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
const log = (label, v) => console.log(`\n== ${label} ==`, v);
const eth = (w) => w?.json?.items?.find((i) => i.symbol === "ETH");

log("custody config", (await call("GET", "/api/custody/config")).json);

const addr = await call("GET", "/api/custody/address");
log("deposit address", addr.json);

const w0 = eth(await call("GET", "/api/wallet"));
log("ETH before", `${w0?.balance} (locked ${w0?.locked})`);

const dest = addr.json?.address ?? "0x000000000000000000000000000000000000dead";
const wd = await call("POST", "/api/custody/withdraw", { symbol: "ETH", amount: 0.01, toAddress: dest });
log("withdraw request", wd);

const w1 = eth(await call("GET", "/api/wallet"));
log("ETH after request (expect 0.01 locked)", `${w1?.balance} (locked ${w1?.locked})`);

// Fire one cron pass — hot wallet is unfunded, so broadcast fails and refunds.
console.log("\n-- firing custody cron --");
try {
  execSync(`ssh -i "${KEY}" -o StrictHostKeyChecking=no opt@${IP} "bash /home/opt/oknexus/custody-cron.sh"`, {
    stdio: "ignore",
  });
} catch {}
await sleep(6000);

log("withdrawal history", (await call("GET", "/api/custody/history")).json?.withdrawals);
const w2 = eth(await call("GET", "/api/wallet"));
log("ETH after cron (expect refund → locked 0)", `${w2?.balance} (locked ${w2?.locked})`);

console.log("\nVERIFY EMAIL:", email);
await browser.close();
