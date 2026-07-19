// Registers a fresh user on prod and calls the EVM deposit-address endpoint twice.
// A 0x address (returned identically both times) proves: auth → getOrCreateDepositAddress
// → Turnkey createWallet → DB persist works end-to-end. Run: node scripts/verify-turnkey-address.mjs
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const email = `tk_${Date.now()}@nexus.test`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", `--host-resolver-rules=MAP oknexusexchange.com ${IP}`, "--ignore-certificate-errors"],
  defaultViewport: { width: 1200, height: 900 },
});
const page = await browser.newPage();
const call = (m, p) =>
  page.evaluate(
    async (m, p) => {
      const r = await fetch(p, { method: m, cache: "no-store" });
      let j = null;
      try {
        j = await r.json();
      } catch {}
      return { status: r.status, json: j };
    },
    m,
    p,
  );
const sessionOk = async () => (await call("GET", "/api/wallet")).status === 200;

await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "TK Bot");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', "TestPass12345");
await page.click('button[type="submit"]');
await sleep(7000);
if (!(await sessionOk())) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', "TestPass12345");
  await page.click('button[type="submit"]');
  await sleep(7000);
}
console.log("SESSION_OK", await sessionOk());

const a1 = await call("GET", "/api/custody/address?chain=ethereum-sepolia");
console.log("ADDR_CALL_1", a1.status, JSON.stringify(a1.json));
const a2 = await call("GET", "/api/custody/address?chain=ethereum-sepolia");
console.log("ADDR_CALL_2", a2.status, a2.json?.address);
console.log("IDEMPOTENT", Boolean(a1.json?.address) && a1.json?.address === a2.json?.address);

await browser.close();
