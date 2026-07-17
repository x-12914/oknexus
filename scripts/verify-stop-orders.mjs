import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const PW = "TestPass12345";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const email = `stop_${Date.now()}@nexus.test`;

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
const place = (body) => call("POST", "/api/orders", { pair: "BTC-USDT", ...body });

await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "Stop Bot");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', PW);
await page.click('button[type="submit"]');
await sleep(7000);

const tick = (await call("GET", "/api/markets/BTC-USDT/ticker")).json;
const P = tick.last;
console.log("PRICE", P);

// Valid placements → PENDING
const sellStop = await place({ side: "SELL", type: "STOP", quantity: 0.001, triggerPrice: +(P * 0.97).toFixed(2) });
console.log("SELL_STOP_PENDING ", sellStop.status === 200 && sellStop.json?.status === "PENDING", `(status ${sellStop.status}/${sellStop.json?.status})`);

const buyStop = await place({ side: "BUY", type: "STOP", quantity: 0.001, triggerPrice: +(P * 1.03).toFixed(2) });
console.log("BUY_STOP_PENDING  ", buyStop.status === 200 && buyStop.json?.status === "PENDING", `(status ${buyStop.status})`);

const stopLimit = await place({ side: "SELL", type: "STOP_LIMIT", quantity: 0.001, triggerPrice: +(P * 0.97).toFixed(2), price: +(P * 0.96).toFixed(2) });
console.log("STOP_LIMIT_PENDING", stopLimit.status === 200 && stopLimit.json?.status === "PENDING", `(status ${stopLimit.status})`);

// Wrong-side triggers rejected
const badSell = await place({ side: "SELL", type: "STOP", quantity: 0.001, triggerPrice: +(P * 1.03).toFixed(2) });
console.log("SELL_ABOVE_400    ", badSell.status === 400, `(status ${badSell.status})`);
const badBuy = await place({ side: "BUY", type: "STOP", quantity: 0.001, triggerPrice: +(P * 0.97).toFixed(2) });
console.log("BUY_BELOW_400     ", badBuy.status === 400, `(status ${badBuy.status})`);

// Missing trigger rejected
const noTrig = await place({ side: "SELL", type: "STOP", quantity: 0.001 });
console.log("NO_TRIGGER_400    ", noTrig.status === 400, `(status ${noTrig.status})`);

// Open orders list includes the pending stops with trigger prices
const open = (await call("GET", "/api/orders?pair=BTC-USDT")).json?.orders ?? [];
const pendings = open.filter((o) => o.status === "PENDING");
console.log("OPEN_HAS_PENDING  ", pendings.length === 3, `(${pendings.length} pending)`);
console.log("TRIGGER_PRICE_SET ", pendings.every((o) => typeof o.triggerPrice === "number" && o.triggerPrice > 0), "(all have triggerPrice)");

// Cancel one → removed from open orders
const cancelId = sellStop.json?.id;
const cancelled = await call("DELETE", `/api/orders/${cancelId}`);
console.log("CANCEL_STOP       ", cancelled.status === 200 && cancelled.json?.status === "CANCELLED", `(status ${cancelled.json?.status})`);
const open2 = (await call("GET", "/api/orders?pair=BTC-USDT")).json?.orders ?? [];
console.log("CANCELLED_GONE    ", !open2.some((o) => o.id === cancelId), "(no longer open)");

await browser.close();
