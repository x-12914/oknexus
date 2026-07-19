import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const FILE =
  "file:///C:/Users/xxx85/AppData/Local/Temp/claude/C--Users-xxx85-Downloads-trading-proj/dbfb465d-f02a-4604-8718-2554414efc50/scratchpad/logo-preview.html";
const OUT =
  "C:\\Users\\xxx85\\AppData\\Local\\Temp\\claude\\C--Users-xxx85-Downloads-trading-proj\\dbfb465d-f02a-4604-8718-2554414efc50\\scratchpad\\logo-preview.png";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--allow-file-access-from-files"],
  defaultViewport: { width: 900, height: 560, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
await page.goto(FILE, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: OUT, type: "png" });
console.log("OK ->", OUT);
await browser.close();
