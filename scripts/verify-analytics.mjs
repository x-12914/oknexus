import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const PW = "TestPass12345";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const email = `anl_${Date.now()}@nexus.test`;

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

await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "Analytics Bot");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', PW);
await page.click('button[type="submit"]');
await sleep(7000);

// Generate a spot trade so volume/fees are non-zero.
const buy = await call("POST", "/api/orders", { pair: "BTC-USDT", side: "BUY", type: "MARKET", quantity: 0.001 });
console.log("SEED_TRADE        ", buy.status === 200 && buy.json?.status === "FILLED", `(status ${buy.json?.status})`);

const a = (await call("GET", "/api/analytics")).json;
const allocSum = a.assets.reduce((s, x) => s + x.pct, 0);
const byType = Object.fromEntries(a.byType.map((t) => [t.type, t.count]));
const today = a.volumeSeries[a.volumeSeries.length - 1];

console.log("TOTAL_POSITIVE    ", a.totalUsd > 0, `($${Math.round(a.totalUsd)})`);
console.log("ASSETS_LISTED     ", a.assets.length >= 3, `(${a.assets.map((x) => x.symbol).join(",")})`);
console.log("ALLOC_SUMS_100    ", Math.abs(allocSum - 100) < 1.5, `(${allocSum.toFixed(1)}%)`);
console.log("CHANGE_IS_NUMBER  ", typeof a.change24hPct === "number", `(${a.change24hPct.toFixed(2)}%)`);
console.log("TRADES>=1         ", a.totals.trades >= 1, `(${a.totals.trades})`);
console.log("VOLUME>0          ", a.totals.volumeUsd > 0, `($${a.totals.volumeUsd.toFixed(2)})`);
console.log("FEES>0            ", a.totals.feesUsd > 0, `($${a.totals.feesUsd.toFixed(4)})`);
console.log("BYTYPE_SEED+SPOT  ", !!byType.SEED && !!byType.SPOT, `(${JSON.stringify(byType)})`);
console.log("SERIES_30         ", a.volumeSeries.length === 30);
console.log("TODAY_VOLUME>0    ", today.volumeUsd > 0, `(${today.date}: $${today.volumeUsd.toFixed(2)})`);

// CSV export
const csv = await page.evaluate(async () => {
  const r = await fetch("/api/analytics/export", { cache: "no-store" });
  const text = await r.text();
  return { status: r.status, ct: r.headers.get("content-type"), head: text.slice(0, 40), lines: text.split("\n").length };
});
console.log("CSV_EXPORT        ", csv.status === 200 && (csv.ct || "").includes("csv") && csv.head.startsWith("Date,Type,Symbol"), `(${csv.lines} lines, ct ${csv.ct})`);

await browser.close();
