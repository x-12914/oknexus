import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:3000";
const OUT = "C:\\Users\\xxx85\\Downloads\\trading proj\\screenshots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
});
const page = await browser.newPage();

await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 40000 });
await sleep(3500); // let live tickers load
await page.screenshot({ path: `${OUT}\\landing-hero.png`, type: "png" });
console.log("OK landing-hero");
await page.screenshot({ path: `${OUT}\\landing-full.png`, type: "png", fullPage: true });
console.log("OK landing-full");

// Dark variant of the hero
await page.evaluate(() => {
  document.documentElement.setAttribute("data-theme", "dark");
});
await sleep(600);
await page.screenshot({ path: `${OUT}\\landing-hero-dark.png`, type: "png" });
console.log("OK landing-hero-dark");

await browser.close();
