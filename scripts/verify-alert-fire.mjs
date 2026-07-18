import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const PW = "TestPass12345";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const email = `afire_${Date.now()}@nexus.test`;

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

await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "Fire Bot");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', PW);
await page.click('button[type="submit"]');
await sleep(7000);

// Tight two-sided BTC alerts — the live market crosses one within a couple minutes.
async function mk(mult) {
  const P = await price();
  return call("POST", "/api/alerts", { symbol: "BTC", target: +(P * mult).toFixed(2) });
}
const aAbove = await mk(1.0003);
const aBelow = await mk(0.9997);
const ids = [aAbove.json?.id, aBelow.json?.id].filter(Boolean);
console.log("PLACED", ids.length, "| above", aAbove.json?.target, "below", aBelow.json?.target);

let firedId = null;
for (let i = 0; i < 30 && !firedId; i++) {
  await sleep(12000);
  const list = (await call("GET", "/api/alerts")).json?.alerts ?? [];
  const t = list.find((a) => ids.includes(a.id) && a.triggered);
  if (t) firedId = t.id;
  process.stdout.write(`  poll ${i + 1}\r`);
}
console.log("");
console.log("ALERT_TRIGGERED   ", !!firedId, `(id ${firedId ?? "none"})`);
if (firedId) {
  const n = (await call("GET", "/api/notifications")).json?.items ?? [];
  console.log("PRICE_NOTIFICATION", n.some((x) => x.title.includes("price alert")), "(expect true)");
}

await browser.close();
