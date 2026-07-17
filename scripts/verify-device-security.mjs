import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const email = `dev_${Date.now()}@nexus.test`;
const PW = "TestPass12345";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
const call = (m, p) =>
  page.evaluate(
    async (m, p) => {
      const r = await fetch(p, { method: m, cache: "no-store" });
      let j = null;
      try {
        j = await r.json();
      } catch {}
      return { status: r.status, json: j };
    },
    m,
    p,
  );

// Register → authenticated, email unverified by default.
await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "Device Bot");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', PW);
await page.click('button[type="submit"]');
await sleep(7000);

console.log("SESSION_BEFORE     ", (await call("GET", "/api/wallet")).status, "(expect 200)");

// Unverified banner should render in the app shell.
await page.goto(`${BASE}/wallet`, { waitUntil: "networkidle2" });
const body = await page.evaluate(() => document.body.innerText);
console.log("VERIFY_BANNER      ", body.includes("Verify your email"), "(expect true)");

// Resend endpoint: auth + logic reached (200 if sent, 502 if Resend gates delivery).
const rs = await call("POST", "/api/auth/verify-email/resend");
console.log("RESEND_REACHED     ", rs.status !== 401 && rs.status !== 404, `(status ${rs.status}; expect 200 or 502)`);

// Sign out of all devices → tokenVersion bump invalidates THIS session too.
console.log("LOGOUT_ALL         ", (await call("POST", "/api/auth/logout-all")).status, "(expect 200)");
await sleep(500);
console.log("SESSION_AFTER      ", (await call("GET", "/api/wallet")).status, "(expect 401 — revoked)");

await browser.close();
