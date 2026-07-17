import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const email = `sec_${Date.now()}@nexus.test`;
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
  defaultViewport: { width: 1100, height: 850 },
});
const page = await browser.newPage();
await page.setUserAgent(UA);

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

// Register → this signs in via authorize(), which records a login event.
await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "Sec Bot");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', PW);
await page.click('button[type="submit"]');
await sleep(7000);
console.log("SESSION_OK           ", (await call("GET", "/api/wallet")).status === 200);

// Login history renders on /security with the just-recorded sign-in.
await page.goto(`${BASE}/security`, { waitUntil: "networkidle2" });
const html = await page.content();
console.log("HISTORY_SECTION      ", html.includes("Login history"), "(expect true)");
console.log("HISTORY_HAS_ENTRY    ", !html.includes("No sign-ins recorded yet"), "(expect true)");
console.log("HISTORY_DEVICE_PARSED", html.includes("Chrome"), "(expect true — UA parsed)");

// Forgot-password: identical neutral 200 for existing + unknown (no account enumeration).
const f1 = await call("POST", "/api/auth/forgot-password", { email });
console.log("FORGOT_EXISTING      ", f1.status, JSON.stringify(f1.json), "(expect 200 {ok:true})");
const f2 = await call("POST", "/api/auth/forgot-password", { email: `nobody_${Date.now()}@nope.test` });
console.log("FORGOT_UNKNOWN       ", f2.status, JSON.stringify(f2.json), "(expect 200 {ok:true})");

// Reset-password: invalid token and short password both rejected.
const r1 = await call("POST", "/api/auth/reset-password", {
  token: "bogus.token.value.here",
  password: "Whatever12345",
});
console.log("RESET_BAD_TOKEN      ", r1.status, "(expect 400)");
const r2 = await call("POST", "/api/auth/reset-password", {
  token: "bogus.token.value.here",
  password: "short",
});
console.log("RESET_SHORT_PW       ", r2.status, "(expect 400)");

await browser.close();
