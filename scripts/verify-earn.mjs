import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const PW = "TestPass12345";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const email = `earn_${Date.now()}@nexus.test`;

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
const w = async (s) => {
  const it = (await call("GET", "/api/wallet")).json.items.find((i) => i.symbol === s);
  return { avail: it?.balance ?? 0, locked: it?.locked ?? 0 };
};

await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "Earn Bot");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', PW);
await page.click('button[type="submit"]');
await sleep(7000);

const b0 = await w("USDT");
const st = await call("POST", "/api/earn/stake", { symbol: "USDT", amount: 1000 });
console.log("STAKE_OK          ", st.status === 200 && st.json?.principal === 1000, `(apy ${st.json?.apy})`);

const b1 = await w("USDT");
console.log("PRINCIPAL_LOCKED  ", Math.abs(b1.avail - (b0.avail - 1000)) < 1e-6 && Math.abs(b1.locked - (b0.locked + 1000)) < 1e-6, `(avail ${b0.avail}->${b1.avail}, locked ${b0.locked}->${b1.locked})`);

const e0 = (await call("GET", "/api/earn")).json;
const pos = e0.positions[0];
console.log("POSITION_LISTED   ", e0.positions.length === 1 && pos.symbol === "USDT", `(${e0.positions.length})`);
const accrued0 = pos.accrued;
await sleep(6000);
const accrued1 = (await call("GET", "/api/earn")).json.positions[0].accrued;
console.log("REWARDS_ACCRUING  ", accrued1 > accrued0, `(${accrued0.toExponential(3)} -> ${accrued1.toExponential(3)})`);

const un = await call("POST", "/api/earn/unstake", { id: pos.id });
console.log("UNSTAKE_OK        ", un.status === 200 && un.json?.principal === 1000 && un.json?.reward > 0, `(reward ${un.json?.reward?.toExponential(3)})`);

const b2 = await w("USDT");
console.log("PRINCIPAL_RETURNED", Math.abs(b2.avail - (10000 + un.json.reward)) < 1e-6 && b2.locked === 0, `(avail ${b2.avail}, locked ${b2.locked})`);
console.log("POSITIONS_EMPTY   ", (await call("GET", "/api/earn")).json.positions.length === 0);

const n = (await call("GET", "/api/notifications")).json?.items ?? [];
console.log("UNSTAKE_NOTIF     ", n.some((x) => x.title === "Unstaked"));

// Guards
console.log("INSUFFICIENT_400  ", (await call("POST", "/api/earn/stake", { symbol: "USDT", amount: 1e9 })).status === 400);
console.log("BAD_ASSET_400     ", (await call("POST", "/api/earn/stake", { symbol: "XRP", amount: 1 })).status === 400);

await browser.close();
