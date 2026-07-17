import puppeteer from "puppeteer-core";
import { authenticator } from "otplib";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const PW = "TestPass12345";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ts = Date.now();
const emailA = `nfa_${ts}@nexus.test`;
const emailB = `nfb_${ts}@nexus.test`;

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
async function newCtxPage() {
  const ctx = browser.createBrowserContext
    ? await browser.createBrowserContext()
    : await browser.createIncognitoBrowserContext();
  return ctx.newPage();
}
const bindCall = (page) => (m, p, body) =>
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
async function register(page, name, email) {
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
  await page.type('input[autocomplete="name"]', name);
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', PW);
  await page.click('button[type="submit"]');
  await sleep(7000);
}

// User A
const pageA = await newCtxPage();
const callA = bindCall(pageA);
await register(pageA, "Notif A", emailA);

let nA = (await callA("GET", "/api/notifications")).json;
console.log("WELCOME_PRESENT   ", nA.items.some((i) => i.title.includes("Welcome")), "· unread", nA.unread);

await callA("POST", "/api/notifications/read", {});
nA = (await callA("GET", "/api/notifications")).json;
console.log("MARK_READ_UNREAD0 ", nA.unread === 0, "(expect true)");

// Enable 2FA → a SECURITY notification, freshly unread
const setup = await callA("POST", "/api/auth/2fa/setup");
const secret = setup.json?.secret;
await callA("POST", "/api/auth/2fa/enable", { code: authenticator.generate(secret) });
nA = (await callA("GET", "/api/notifications")).json;
console.log("SECURITY_2FA      ", nA.items.some((i) => i.type === "SECURITY" && i.title.includes("enabled")), "· unread", nA.unread);

// User B receives a transfer from A
const pageB = await newCtxPage();
const callB = bindCall(pageB);
await register(pageB, "Notif B", emailB);
await callA("POST", "/api/wallet/transfer", { toEmail: emailB, symbol: "USDT", amount: 50 });
await sleep(600);
const nB = (await callB("GET", "/api/notifications")).json;
console.log("TRANSFER_RECEIVED ", nB.items.some((i) => i.type === "TRANSFER" && i.title.includes("received")), "· unread", nB.unread);

await browser.close();
