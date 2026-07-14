import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const email = `bal_${Date.now()}@nexus.test`;
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
const balLines = () =>
  page.evaluate(() =>
    document.body.innerText.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("Balance:")),
  );

// Register (+ login fallback).
await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "Bal Bot");
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

// Swap 200 USDT -> BTC so balances differ from the 10,000/0.05 seed.
const q = await call("POST", "/api/swap/quote", { from: "USDT", to: "BTC", amount: 200 });
await call("POST", "/api/swap/execute", { quoteId: q.json?.quoteId });

const w = (await call("GET", "/api/wallet")).json;
const wUSDT = w?.items?.find((i) => i.symbol === "USDT")?.balance;
const wBTC = w?.items?.find((i) => i.symbol === "BTC")?.balance;
console.log("WALLET API →  USDT:", wUSDT, " BTC:", wBTC);

// Swap page balances.
await page.goto(`${BASE}/swap`, { waitUntil: "networkidle2" });
await sleep(3500);
console.log("SWAP page  →", await balLines());

// Buy/Sell page, SELL mode (shows the BTC balance).
await page.goto(`${BASE}/buy`, { waitUntil: "networkidle2" });
await sleep(2500);
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Sell");
  b?.click();
});
await sleep(3500);
console.log("BUY/SELL   →", await balLines());

await browser.close();
