import puppeteer from "puppeteer-core";
import { execSync } from "node:child_process";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const KEY = `${process.env.USERPROFILE}\\.ssh\\oknexus_deploy_ed25519`;
// Send to the hot wallet itself (valid checksummed address) — a real on-chain tx
// with no wasted test ETH and no re-deposit side effect.
const DEST = "0xA7E4cE3cCE44EbA27f238f6E822F2C6E1c6d7e1B";
const email = `wd_${Date.now()}@nexus.test`;
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
  defaultViewport: { width: 1200, height: 800 },
});
const page = await browser.newPage();

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
const ethBal = async () => (await call("GET", "/api/wallet")).json?.items?.find((i) => i.symbol === "ETH");
const sessionOk = async () => (await call("GET", "/api/wallet")).status === 200;

async function fillAuth() {
  const name = await page.$('input[autocomplete="name"]');
  if (name) await name.type("Withdraw Demo");
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', "TestPass12345");
  await page.click('button[type="submit"]');
  await sleep(7000);
}

// Register, then ensure the session actually took (log in explicitly if not).
await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await fillAuth();
if (!(await sessionOk())) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await fillAuth();
}
for (let i = 0; i < 5 && !(await sessionOk()); i++) await sleep(3000);
if (!(await sessionOk())) {
  console.log("COULD NOT ESTABLISH SESSION");
  await browser.close();
  process.exit(1);
}
console.log("session OK");

console.log("ETH before:", (await ethBal())?.balance);
const wd = await call("POST", "/api/custody/withdraw", { symbol: "ETH", amount: 0.01, toAddress: DEST });
console.log("withdraw request:", wd.status, JSON.stringify(wd.json));
const afterReq = await ethBal();
console.log("ETH after request:", `${afterReq?.balance} (locked ${afterReq?.locked})`);

let w = null;
for (let i = 0; i < 9; i++) {
  cron();
  await sleep(12000);
  w = (await call("GET", "/api/custody/history")).json?.withdrawals?.[0];
  console.log(`[${i + 1}] status=${w?.status} tx=${w?.txHash ?? "-"}`);
  if (w?.status === "CONFIRMED" || w?.status === "FAILED") break;
}

console.log("\nFINAL:", JSON.stringify(w, null, 2));
const done = await ethBal();
console.log("ETH after settle:", `${done?.balance} (locked ${done?.locked})`);
await browser.close();
