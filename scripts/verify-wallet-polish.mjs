import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const PW = "TestPass12345";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ts = Date.now();
const emailA = `wpa_${ts}@nexus.test`;
const emailB = `wpb_${ts}@nexus.test`;

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
const bal = (w, s) => w?.items?.find((i) => i.symbol === s)?.balance ?? 0;

// Recipient B
const pageB = await newCtxPage();
const callB = bindCall(pageB);
await register(pageB, "Recipient B", emailB);
const bUsdt0 = bal((await callB("GET", "/api/wallet")).json, "USDT");

// Sender A
const pageA = await newCtxPage();
const callA = bindCall(pageA);
await register(pageA, "Sender A", emailA);
const aUsdt0 = bal((await callA("GET", "/api/wallet")).json, "USDT");

// Transfer 100 USDT A -> B
const t = await callA("POST", "/api/wallet/transfer", {
  toEmail: emailB,
  symbol: "USDT",
  amount: 100,
  note: "verify",
});
console.log("TRANSFER_OK       ", t.status === 200 && t.json?.ok === true, `(status ${t.status})`);

const aUsdt1 = bal((await callA("GET", "/api/wallet")).json, "USDT");
const bUsdt1 = bal((await callB("GET", "/api/wallet")).json, "USDT");
console.log("SENDER_DEBITED    ", Math.abs(aUsdt0 - aUsdt1 - 100) < 1e-6, `(${aUsdt0} -> ${aUsdt1})`);
console.log("RECIPIENT_CREDITED", Math.abs(bUsdt1 - bUsdt0 - 100) < 1e-6, `(${bUsdt0} -> ${bUsdt1})`);

// Guards
console.log("SELF_SEND_400     ", (await callA("POST", "/api/wallet/transfer", { toEmail: emailA, symbol: "USDT", amount: 1 })).status, "(expect 400)");
console.log("NO_USER_400       ", (await callA("POST", "/api/wallet/transfer", { toEmail: `no_${ts}@none.test`, symbol: "USDT", amount: 1 })).status, "(expect 400)");
console.log("OVERDRAW_400      ", (await callA("POST", "/api/wallet/transfer", { toEmail: emailB, symbol: "USDT", amount: 1e12 })).status, "(expect 400)");

// Activity — both sides labelled TRANSFER
const aAct = (await callA("GET", "/api/transactions")).json?.activity ?? [];
const bAct = (await callB("GET", "/api/transactions")).json?.activity ?? [];
console.log("A_ACT_TRANSFER_OUT", aAct.some((x) => x.type === "TRANSFER" && x.delta < 0), "(expect true)");
console.log("B_ACT_TRANSFER_IN ", bAct.some((x) => x.type === "TRANSFER" && x.delta > 0), "(expect true)");

// Withdrawal fees surfaced in config
const cfg = (await callA("GET", "/api/custody/config")).json;
console.log("WITHDRAW_FEES     ", JSON.stringify(cfg?.withdrawFees ?? {}));

// Deposit QR (only rendered when custody is configured)
await pageA.goto(`${BASE}/deposit`, { waitUntil: "networkidle2" });
await sleep(1500);
const depHtml = await pageA.content();
console.log("CUSTODY_CONFIGURED", cfg?.configured, " DEPOSIT_QR_PRESENT", depHtml.includes("Deposit address QR code"));

await browser.close();
