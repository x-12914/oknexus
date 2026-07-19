import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const PW = "TestPass12345";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ts = Date.now();
const email1 = `rl1_${ts}@nexus.test`;
const email2 = `rl2_${ts}@nexus.test`;

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
async function register(email) {
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', PW);
  await page.click('button[type="submit"]');
  await sleep(6000);
}

await register(email1);

// Hammer the pre-login password probe with wrong passwords; the limiter (max 8 / window)
// should lock the account+IP and start returning 429.
const statuses = [];
let got429 = false;
for (let i = 0; i < 11; i++) {
  const r = await call("POST", "/api/auth/2fa/check", { email: email1, password: `wrong${i}` });
  statuses.push(r.status);
  if (r.status === 429) got429 = true;
}
console.log("RATE_LIMIT_429     ", got429, `(statuses: ${statuses.join(",")})`);

// A different account from the same IP must NOT be locked (per-account keying).
await register(email2);
const other = await call("POST", "/api/auth/2fa/check", { email: email2, password: "nope" });
console.log("PER_ACCOUNT_KEYED  ", other.status === 401, `(other acct status ${other.status}, expect 401 not 429)`);

await browser.close();
