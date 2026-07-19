import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const BASE = "https://oknexusexchange.com";
const email = `split_${Date.now()}@nexus.test`;
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
  defaultViewport: { width: 1280, height: 900 },
});
const page = await browser.newPage();
const textOf = async (path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2" });
  return { url: page.url(), body: await page.evaluate(() => document.body.innerText) };
};

// Register → authenticated session (so /swap and /otc render instead of bouncing to /login).
await page.goto(`${BASE}/register`, { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "Split Bot");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', PW);
await page.click('button[type="submit"]');
await sleep(7000);

// App side nav shows BOTH items, separately.
const swap = await textOf("/swap");
console.log("SWAP_URL_OK       ", swap.url.endsWith("/swap"), "(expect true)");
console.log("SWAP_CARD         ", swap.body.includes("Instant Swap"), "(expect true — SwapCard)");
console.log("NAV_HAS_SWAP      ", swap.body.includes("Instant Swap"), "(expect true)");
console.log("NAV_HAS_OTC       ", swap.body.includes("OTC Desk"), "(expect true)");
console.log("NAV_NO_CONVERT    ", !swap.body.split("\n").some((l) => l.trim() === "Convert"), "(expect true)");

const otc = await textOf("/otc");
console.log("OTC_URL_OK        ", otc.url.endsWith("/otc"), "(expect true)");
console.log("OTC_DESK          ", otc.body.includes("OTC Trading Desk"), "(expect true — OtcDesk)");

// /convert must redirect to /swap now.
const conv = await textOf("/convert");
console.log("CONVERT_REDIRECTS ", conv.url.endsWith("/swap"), "(expect true → /swap)");

// Public landing lists both as separate products.
const land = await textOf("/");
console.log("LANDING_SWAP      ", land.body.includes("Instant Swap"), "(expect true)");
console.log("LANDING_OTC       ", land.body.includes("OTC Desk"), "(expect true)");

await browser.close();
