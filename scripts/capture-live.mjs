import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = "C:\\Users\\xxx85\\Downloads\\trading proj\\screenshots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--host-resolver-rules=MAP oknexusexchange.com 162.35.175.166",
    "--hide-scrollbars",
  ],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
await page.goto("https://oknexusexchange.com/", { waitUntil: "networkidle2", timeout: 40000 });
await sleep(3000);
await page.screenshot({ path: `${OUT}\\nexus-landing.png`, type: "png" });
console.log("OK light");
await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
await sleep(700);
await page.screenshot({ path: `${OUT}\\nexus-landing-dark.png`, type: "png" });
console.log("OK dark");
await browser.close();
