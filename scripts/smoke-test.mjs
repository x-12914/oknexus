// End-to-end prod smoke test: registers a user and exercises the core flows,
// printing a PASS/FAIL line per check. Run: node scripts/smoke-test.mjs
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const email = `smoke_${Date.now()}@nexus.test`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

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

// 1) Register
await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "Smoke Bot");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', "TestPass12345");
await page.click('button[type="submit"]');
await sleep(7000);
const sess = await call("GET", "/api/wallet");
check("Register + session", sess.status === 200);

// Market data (CoinGecko) — now that the page is on the site.
const tk = await call("GET", "/api/markets/BTC-USDT/ticker");
check("Market data ticker (CoinGecko)", tk.status === 200 && tk.json?.last > 0, `BTC $${tk.json?.last}`);

// 2) Wallet seed balances
const w0 = sess.json;
const usdt0 = w0?.items?.find((i) => i.symbol === "USDT")?.balance ?? 0;
const btc0 = w0?.items?.find((i) => i.symbol === "BTC")?.balance ?? 0;
check("Wallet seeded", usdt0 >= 1000 && btc0 > 0, `USDT ${usdt0}, BTC ${btc0}`);

// 3) Convert — instant swap (small)
const sq = await call("POST", "/api/swap/quote", { from: "USDT", to: "BTC", amount: 200 });
const sx = await call("POST", "/api/swap/execute", { quoteId: sq.json?.quoteId });
const w1 = (await call("GET", "/api/wallet")).json;
const usdt1 = w1?.items?.find((i) => i.symbol === "USDT")?.balance ?? 0;
const btc1 = w1?.items?.find((i) => i.symbol === "BTC")?.balance ?? 0;
check(
  "Convert · instant swap (200 USDT→BTC)",
  sx.status === 200 && usdt1 < usdt0 && btc1 > btc0,
  `USDT ${usdt0}→${usdt1}, BTC ${btc0}→${btc1.toFixed(6)}`,
);

// 4) Convert — OTC routing (large quote, backend reachable)
const oq = await call("POST", "/api/otc/quote", {
  side: "BUY",
  baseSymbol: "BTC",
  settleCurrency: "USDT",
  baseAmount: 1,
});
check(
  "Convert · OTC quote (1 BTC ≥ $50k)",
  oq.status === 200 && oq.json?.price > 0 && !!oq.json?.tierLabel,
  `${oq.json?.tierLabel} @ ${oq.json?.spreadPct}%`,
);

// 5) Custody — Turnkey deposit address
const addr = await call("GET", "/api/custody/address?chain=ethereum-sepolia");
check(
  "Custody · Turnkey EVM address",
  addr.status === 200 && /^0x[0-9a-fA-F]{40}$/.test(addr.json?.address || ""),
  addr.json?.address,
);

// 6) Custody — withdrawal request (control loop entry)
const wd = await call("POST", "/api/custody/withdraw", {
  chain: "ethereum-sepolia",
  symbol: "ETH",
  amount: 0.001,
  toAddress: "0x000000000000000000000000000000000000dEaD",
});
check("Custody · withdrawal request", wd.status === 200 && !!wd.json?.id, `status ${wd.json?.status}`);

// 7) P2P ads marketplace loads
const ads = await call("GET", "/api/p2p/ads?side=BUY");
check("P2P · ads marketplace", ads.status === 200 && Array.isArray(ads.json?.ads), `${ads.json?.ads?.length} ads`);

const passed = results.filter((r) => r.ok).length;
console.log(`\nSUMMARY ${passed}/${results.length} passed`);
await browser.close();
