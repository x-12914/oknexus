import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const PW = "TestPass12345";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const email = `tkmc_${Date.now()}@nexus.test`;

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
await page.type('input[autocomplete="name"]', "TK MultiChain");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', PW);
await page.click('button[type="submit"]');
await sleep(7000);

const cfg = (await call("GET", "/api/custody/config")).json;
console.log("CUSTODY_CONFIGURED", cfg.configured === true);
console.log("CHAINS            ", cfg.chains.map((c) => c.chain).join(", "));

const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const addr = async (chain) => (await call("GET", `/api/custody/address?chain=${encodeURIComponent(chain)}`)).json;

const sol = await addr("solana-devnet");
console.log("SOL_ADDRESS       ", B58.test(sol?.address || ""), `(${sol?.address})`);

const btc = await addr("bitcoin-testnet");
console.log("BTC_ADDRESS       ", /^tb1[a-z0-9]{20,}$/.test(btc?.address || ""), `(${btc?.address})`);

const eth = await addr("ethereum-sepolia");
console.log("ETH_ADDRESS       ", /^0x[0-9a-fA-F]{40}$/.test(eth?.address || ""), `(${eth?.address})`);

// Same address returned on a second call (idempotent per user+chain)
const sol2 = await addr("solana-devnet");
console.log("SOL_IDEMPOTENT    ", sol2?.address === sol?.address);

// Default network still Sepolia (mainnet toggle off in prod)
console.log("STILL_SEPOLIA     ", (eth?.explorerUrl || "").includes("sepolia"), `(${eth?.explorerUrl})`);

await browser.close();
