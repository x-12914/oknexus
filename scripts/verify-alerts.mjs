import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const PW = "TestPass12345";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const email = `alert_${Date.now()}@nexus.test`;

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
await page.type('input[autocomplete="name"]', "Alert Bot");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', PW);
await page.click('button[type="submit"]');
await sleep(7000);

const assets = (await call("GET", "/api/swap/assets")).json.assets;
const pBTC = assets.find((a) => a.symbol === "BTC").usdtPrice;
const pETH = assets.find((a) => a.symbol === "ETH").usdtPrice;

// Direction is inferred from the target vs the current price.
const above = await call("POST", "/api/alerts", { symbol: "BTC", target: +(pBTC * 1.05).toFixed(2) });
console.log("CREATE_ABOVE      ", above.status === 200 && above.json?.direction === "ABOVE", `(${above.json?.direction})`);
const below = await call("POST", "/api/alerts", { symbol: "ETH", target: +(pETH * 0.95).toFixed(2) });
console.log("CREATE_BELOW      ", below.status === 200 && below.json?.direction === "BELOW", `(${below.json?.direction})`);

const list = (await call("GET", "/api/alerts")).json;
console.log("LIST_2_ACTIVE     ", list.alerts.filter((a) => !a.triggered).length === 2, `(${list.alerts.length})`);
console.log("PRICES_PRESENT    ", typeof list.prices?.BTC === "number" && typeof list.prices?.ETH === "number");

await call("DELETE", `/api/alerts/${above.json.id}`);
const list2 = (await call("GET", "/api/alerts")).json;
console.log("DELETED           ", !list2.alerts.some((a) => a.id === above.json.id));

console.log("BAD_TARGET_400    ", (await call("POST", "/api/alerts", { symbol: "BTC", target: 0 })).status === 400);
console.log("USDT_REJECTED_400 ", (await call("POST", "/api/alerts", { symbol: "USDT", target: 1 })).status === 400);

await browser.close();
