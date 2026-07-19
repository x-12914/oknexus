import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const PW = "TestPass12345";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const email = `strig_${Date.now()}@nexus.test`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    `--host-resolver-rules=MAP oknexusexchange.com ${IP}`,
    "--ignore-certificate-errors",
  ],
  defaultViewport: { width: 1200, height: 900 },
});
const page = await browser.newPage();
const call = (m, p, body) =>
  page.evaluate(
    async (m, p, body) => {
      const r = await fetch(p, {
        method: m,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
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
    body,
  );
const bal = (w, s) => w?.items?.find((i) => i.symbol === s)?.balance ?? 0;

await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "Trigger Bot");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', PW);
await page.click('button[type="submit"]');
await sleep(7000);

async function placeStop(side, mult) {
  const P = (await call("GET", "/api/markets/BTC-USDT/ticker")).json.last;
  const trigger = +(P * mult).toFixed(2);
  return call("POST", "/api/orders", { pair: "BTC-USDT", side, type: "STOP", quantity: 0.001, triggerPrice: trigger });
}
// Buy stop just above, sell stop just below — the live market crosses one within
// a couple of minutes, and the every-minute cron fires it.
const buy = await placeStop("BUY", 1.001);
const sell = await placeStop("SELL", 0.999);
const ids = [buy.json?.id, sell.json?.id].filter(Boolean);
console.log("PLACED", ids.length, "stops (buy", buy.json?.triggerPrice, "/ sell", sell.json?.triggerPrice, ")");

const w0 = (await call("GET", "/api/wallet")).json;
const btc0 = bal(w0, "BTC");
const usdt0 = bal(w0, "USDT");

let firedId = null;
for (let i = 0; i < 20 && !firedId; i++) {
  await sleep(15000);
  const open = (await call("GET", "/api/orders?pair=BTC-USDT")).json?.orders ?? [];
  const stillPending = new Set(open.filter((o) => o.status === "PENDING").map((o) => o.id));
  firedId = ids.find((id) => !stillPending.has(id)) ?? null;
  process.stdout.write(`  poll ${i + 1}: pending ${[...stillPending].length}\r`);
}
console.log("");
console.log("STOP_TRIGGERED    ", !!firedId, firedId ? "(a stop left PENDING → fired)" : "(no cross within window)");

if (firedId) {
  const w1 = (await call("GET", "/api/wallet")).json;
  console.log("BALANCE_MOVED     ", bal(w1, "BTC") !== btc0 || bal(w1, "USDT") !== usdt0, `(BTC ${btc0}->${bal(w1, "BTC")}, USDT ${usdt0}->${bal(w1, "USDT")})`);
  const notifs = (await call("GET", "/api/notifications")).json?.items ?? [];
  console.log("TRADE_NOTIFICATION", notifs.some((n) => n.type === "TRADE" && n.title.includes("Stop order")), "(expect true)");
}

await browser.close();
