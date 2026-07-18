import puppeteer from "puppeteer-core";
import { authenticator } from "otplib";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const PW = "TestPass12345";
const DEST = "0x000000000000000000000000000000000000dEaD";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const email = `wc_${Date.now()}@nexus.test`;

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
const wd = (body) => call("POST", "/api/custody/withdraw", body);

await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', PW);
await page.click('button[type="submit"]');
await sleep(6000);

// No 2FA yet → withdrawal should be accepted without a code.
const w1 = await wd({ chain: "ethereum-sepolia", symbol: "ETH", amount: 0.1, toAddress: DEST });
console.log("WITHDRAW_NO2FA_OK  ", w1.status === 200, `(status ${w1.status} · ${w1.json?.status ?? w1.json?.error})`);

const st1 = (await call("GET", "/api/custody/withdraw")).json;
console.log("LIMIT_TRACKED      ", st1.limit?.limitUsd === 50000 && st1.limit?.usedUsd > 0 && st1.limit?.remainingUsd < 50000, `(used $${st1.limit?.usedUsd?.toFixed(0)}, left $${st1.limit?.remainingUsd?.toFixed(0)})`);
console.log("STATUS_NEEDS2FA_F  ", st1.needs2FA === false);

// Enable 2FA.
const setup = await call("POST", "/api/auth/2fa/setup");
const secret = setup.json?.secret;
await call("POST", "/api/auth/2fa/enable", { code: authenticator.generate(secret) });

// Now a withdrawal without a code must be rejected, with a code accepted.
const w2 = await wd({ chain: "ethereum-sepolia", symbol: "ETH", amount: 0.1, toAddress: DEST });
console.log("WITHDRAW_NOCODE_403", w2.status === 403 && w2.json?.needCode === true, `(status ${w2.status})`);

const w3 = await wd({ chain: "ethereum-sepolia", symbol: "ETH", amount: 0.1, toAddress: DEST, code: authenticator.generate(secret) });
console.log("WITHDRAW_CODE_OK   ", w3.status === 200, `(status ${w3.status} · ${w3.json?.status ?? w3.json?.error})`);

const st2 = (await call("GET", "/api/custody/withdraw")).json;
console.log("STATUS_NEEDS2FA_T  ", st2.needs2FA === true);

await browser.close();
