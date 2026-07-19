// Registers a user (seed 0.5 ETH) and requests a small ETH withdrawal. The cron then
// builds the tx, has Turnkey sign it, and broadcasts via Infura. With an unfunded hot
// wallet the broadcast should fail with "insufficient funds" — which proves signing +
// broadcast work. Prints the withdrawal id so we can read its final status from the DB.
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const email = `wd_${Date.now()}@nexus.test`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", `--host-resolver-rules=MAP oknexusexchange.com ${IP}`, "--ignore-certificate-errors"],
  defaultViewport: { width: 1200, height: 900 },
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

await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "WD Bot");
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

const wd = await call("POST", "/api/custody/withdraw", {
  chain: "ethereum-sepolia",
  symbol: "ETH",
  amount: 0.001,
  toAddress: "0x000000000000000000000000000000000000dEaD",
});
console.log("WITHDRAW_HTTP", wd.status);
console.log("WITHDRAW_RESP", JSON.stringify(wd.json));
console.log("WITHDRAW_ID=" + (wd.json?.id ?? "none"));

await browser.close();
