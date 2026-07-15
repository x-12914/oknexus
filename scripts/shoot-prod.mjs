import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IP = "162.35.175.166";
const DIR = "C:\\Users\\xxx85\\Downloads\\trading proj\\screenshots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    `--host-resolver-rules=MAP oknexusexchange.com ${IP}`,
    "--ignore-certificate-errors",
    "--hide-scrollbars",
  ],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
await page.goto("https://oknexusexchange.com/", { waitUntil: "networkidle2" });
await sleep(3500);
await page.screenshot({ path: `${DIR}\\landing-prod-hero.png` });

// Scroll into the feature rows to trigger the reveal-on-scroll animations.
await page.evaluate(() => window.scrollTo({ top: 1500, behavior: "instant" }));
await sleep(1600);
await page.screenshot({ path: `${DIR}\\landing-prod-features.png` });

console.log("OK");
await browser.close();
