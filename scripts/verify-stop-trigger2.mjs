import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const PW = "TestPass12345";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const email = `strig2_${Date.now()}@nexus.test`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", `--host-resolver-rules=MAP oknexusexchange.com ${IP}`, "--ignore-certificate-errors"],
  defaultViewport: { width: 1200, height: 900 },
});
const page = await browser.newPage();
const call = (m, p, body) =>
  page.evaluate(async (m, p, body) => {
    const r = await fetch(p, { method: m, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
    let j = null; try { j = await r.json(); } catch {}
    return { status: r.status, json: j };
  }, m, p, body);
const price = async () => (await call("GET", "/api/markets/BTC-USDT/ticker")).json.last;
const bal = (w, s) => w?.items?.find((i) => i.symbol === s)?.balance ?? 0;

await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "Trig2 Bot");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', PW);
await page.click('button[type="submit"]');
await sleep(7000);

// Place with retry (guards against sub-second price drift failing validation).
async function placeStop(side, gap) {
  for (let i = 0; i < 5; i++) {
    const P = await price();
    const trigger = +(side === "BUY" ? P * (1 + gap) : P * (1 - gap)).toFixed(2);
    const r = await call("POST", "/api/orders", { pair: "BTC-USDT", side, type: "STOP", quantity: 0.001, triggerPrice: trigger });
    if (r.status === 200) return { id: r.json.id, trigger };
    await sleep(1500);
  }
  return null;
}
const buy = await placeStop("BUY", 0.0003);
const sell = await placeStop("SELL", 0.0003);
const ids = [buy?.id, sell?.id].filter(Boolean);
console.log("PLACED", ids.length, "| buyTrig", buy?.trigger, "sellTrig", sell?.trigger);

const w0 = (await call("GET", "/api/wallet")).json;
const btc0 = bal(w0, "BTC"), usdt0 = bal(w0, "USDT");

let firedId = null, min = Infinity, max = -Infinity, crossed = false;
for (let i = 0; i < 40 && !firedId; i++) {
  await sleep(12000);
  const last = await price();
  min = Math.min(min, last); max = Math.max(max, last);
  if (buy && last >= buy.trigger) crossed = true;
  if (sell && last <= sell.trigger) crossed = true;
  const open = (await call("GET", "/api/orders?pair=BTC-USDT")).json?.orders ?? [];
  const pending = new Set(open.filter((o) => o.status === "PENDING").map((o) => o.id));
  firedId = ids.find((id) => !pending.has(id)) ?? null;
  process.stdout.write(`  poll ${i + 1}: last ${last} min ${min} max ${max} crossed ${crossed} fired ${!!firedId}   \r`);
}
console.log("");
console.log("MARKET_CROSSED    ", crossed, `(min ${min}, max ${max} vs sell ${sell?.trigger}/buy ${buy?.trigger})`);
console.log("STOP_TRIGGERED    ", !!firedId);

if (firedId) {
  const w1 = (await call("GET", "/api/wallet")).json;
  console.log("BALANCE_MOVED     ", bal(w1, "BTC") !== btc0 || bal(w1, "USDT") !== usdt0, `(BTC ${btc0}->${bal(w1, "BTC")}, USDT ${usdt0}->${bal(w1, "USDT")})`);
  const n = (await call("GET", "/api/notifications")).json?.items ?? [];
  console.log("TRADE_NOTIFICATION", n.some((x) => x.type === "TRADE" && x.title.includes("Stop order")));
} else if (crossed) {
  console.log("!!! BUG: market crossed a trigger but the stop did not fire within a cron cycle");
} else {
  console.log("Market stayed flat within the trigger band — no trigger expected (not a failure).");
}

await browser.close();
