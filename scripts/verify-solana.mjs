import puppeteer from "puppeteer-core";
import { execSync } from "node:child_process";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const KEY = `${process.env.USERPROFILE}\\.ssh\\oknexus_deploy_ed25519`;
const HOT = "7VjqnRgLnX4wqhZLnZe8UJLdf16uxFDYrY6kDmCE1j9e";
const email = `sol_${Date.now()}@nexus.test`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const cron = () => {
  try {
    execSync(`ssh -i "${KEY}" -o StrictHostKeyChecking=no opt@${IP} "bash /home/opt/oknexus/custody-cron.sh"`, {
      stdio: "ignore",
    });
  } catch {}
};
const solOf = async (a) => (await conn.getBalance(new PublicKey(a))) / LAMPORTS_PER_SOL;

async function airdrop(addr, sol) {
  for (let i = 0; i < 4; i++) {
    try {
      const sig = await conn.requestAirdrop(new PublicKey(addr), Math.round(sol * LAMPORTS_PER_SOL));
      await conn.confirmTransaction(sig, "confirmed");
      return sig;
    } catch (e) {
      console.log(`  airdrop retry ${i}: ${e.message.slice(0, 60)}`);
      await sleep(8000);
    }
  }
  return null;
}

// 1. Fund the SOL hot wallet (skip if already funded from a prior run).
console.log("hot SOL before:", await solOf(HOT));
if ((await solOf(HOT)) < 0.5) {
  console.log("airdrop →", await airdrop(HOT, 1));
  await sleep(2000);
}
console.log("hot SOL now:", await solOf(HOT));

// 2. Register + session.
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", `--host-resolver-rules=MAP oknexusexchange.com ${IP}`, "--ignore-certificate-errors"],
  defaultViewport: { width: 1200, height: 800 },
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
  if (n) await n.type("Sol Bot");
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

// 3. SOL deposit address (index 1 on solana-devnet).
const addr = (await call("GET", "/api/custody/address?chain=solana-devnet")).json;
console.log("SOL deposit address:", addr?.address);

const solLedger = async () => (await call("GET", "/api/wallet")).json?.items?.find((i) => i.symbol === "SOL")?.balance;
console.log("SOL ledger before:", await solLedger());

// 4. Withdraw 0.2 SOL to the user's OWN deposit address → tests withdrawal AND
//    produces a real on-chain deposit for the scanner to detect + credit.
const wd = await call("POST", "/api/custody/withdraw", {
  chain: "solana-devnet",
  symbol: "SOL",
  amount: 0.2,
  toAddress: addr.address,
});
console.log("withdraw request:", wd.status, JSON.stringify(wd.json));

// 5. Drive the cron until the withdrawal confirms and the deposit is credited.
for (let i = 0; i < 12; i++) {
  cron();
  await sleep(10000);
  const h = (await call("GET", "/api/custody/history")).json;
  const w = (h?.withdrawals ?? []).find((x) => x.chain === "solana-devnet");
  const d = (h?.deposits ?? []).find((x) => x.chain === "solana-devnet");
  console.log(
    `[${i + 1}] withdraw=${w?.status ?? "-"} tx=${w?.txHash ? w.txHash.slice(0, 10) : "-"} deposit=${d?.status ?? "-"}`,
  );
  if (w?.status === "CONFIRMED" && d?.status === "CREDITED") break;
}

console.log("\nSOL ledger after:", await solLedger());
const h = (await call("GET", "/api/custody/history")).json;
console.log("SOL withdrawal:", JSON.stringify((h?.withdrawals ?? []).find((x) => x.chain === "solana-devnet"), null, 2));
console.log("SOL deposit:", JSON.stringify((h?.deposits ?? []).find((x) => x.chain === "solana-devnet"), null, 2));
await browser.close();
