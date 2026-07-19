import puppeteer from "puppeteer-core";
import { authenticator } from "otplib";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const email = `f2a_${Date.now()}@nexus.test`;
const PW = "TestPass12345";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", `--host-resolver-rules=MAP oknexusexchange.com ${IP}`, "--ignore-certificate-errors"],
  defaultViewport: { width: 1100, height: 850 },
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

await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "F2A Bot");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', PW);
await page.click('button[type="submit"]');
await sleep(7000);
console.log("SESSION_OK", (await call("GET", "/api/wallet")).status === 200);

const setup = await call("POST", "/api/auth/2fa/setup");
const secret = setup.json?.secret;
console.log("SETUP", setup.status, "hasSecret", !!secret, "hasQR", !!setup.json?.qr);

console.log("ENABLE_WRONG_CODE", (await call("POST", "/api/auth/2fa/enable", { code: "000000" })).status, "(expect 400)");
console.log("ENABLE_REAL_CODE", (await call("POST", "/api/auth/2fa/enable", { code: authenticator.generate(secret) })).status, "(expect 200)");
console.log("LOGIN_CHECK_needs2FA", (await call("POST", "/api/auth/2fa/check", { email, password: PW })).json?.needs2FA, "(expect true)");
console.log("DISABLE", (await call("POST", "/api/auth/2fa/disable", { code: authenticator.generate(secret) })).status, "(expect 200)");
console.log("CHECK_after_disable", (await call("POST", "/api/auth/2fa/check", { email, password: PW })).json?.needs2FA, "(expect false)");

await browser.close();
