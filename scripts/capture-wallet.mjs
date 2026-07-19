import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "C:\\Users\\xxx85\\Downloads\\trading proj\\screenshots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const email = `demo_${Date.now()}@nexus.test`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--host-resolver-rules=MAP oknexusexchange.com 162.35.175.166", "--hide-scrollbars"],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
await page.goto("https://oknexusexchange.com/register", { waitUntil: "networkidle2" });
await page.type('input[autocomplete="name"]', "Demo Trader");
await page.type('input[type="email"]', email);
await page.type('input[type="password"]', "TestPass12345");
await page.click('button[type="submit"]');
await sleep(5000); // register + sign-in + redirect
await page.goto("https://oknexusexchange.com/wallet", { waitUntil: "networkidle2" });
await sleep(3500); // load balances
await page.screenshot({ path: `${OUT}\\nexus-wallet.png`, type: "png" });
console.log("OK wallet", email);
await browser.close();
