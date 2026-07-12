import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:3000";
const OUT = "C:\\Users\\xxx85\\Downloads\\trading proj\\screenshots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  try { localStorage.setItem("theme", "dark"); } catch {}
});

await page.goto(`${BASE}/trade/BTC-USDT`, { waitUntil: "networkidle2", timeout: 30000 });
await sleep(5500);
await page.screenshot({ path: `${OUT}\\dark-trade.png`, type: "png" });
console.log("OK dark-trade");

await page.goto(`${BASE}/swap`, { waitUntil: "networkidle2", timeout: 30000 });
await sleep(2500);
await page.screenshot({ path: `${OUT}\\dark-swap.png`, type: "png" });
console.log("OK dark-swap");

await browser.close();
