import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DIR = "C:\\Users\\xxx85\\Downloads\\trading proj\\screenshots";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars"],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();

let ok = false;
for (let i = 0; i < 40; i++) {
  try {
    await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 8000 });
    ok = true;
    break;
  } catch {
    await sleep(3000);
  }
}
if (!ok) {
  console.log("SERVER_NOT_READY");
  process.exit(1);
}
await sleep(3000); // let live prices load + settle

await page.screenshot({ path: `${DIR}\\landing-new-full.png`, fullPage: true });
await page.screenshot({ path: `${DIR}\\landing-new-hero.png` }); // just the fold

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
await sleep(2500);
await page.screenshot({ path: `${DIR}\\landing-new-mobile.png` });

console.log("SHOT_OK");
await browser.close();
