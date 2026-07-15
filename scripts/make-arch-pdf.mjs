import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SRC = "file:///C:/Users/xxx85/AppData/Local/Temp/claude/C--Users-xxx85-Downloads-trading-proj/dbfb465d-f02a-4604-8718-2554414efc50/scratchpad/build-arch-doc.html";
const OUT = "C:\\Users\\xxx85\\Downloads\\trading proj\\OKNexus-Build-and-Wallet-Architecture.pdf";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.goto(SRC, { waitUntil: "networkidle0" });
await page.pdf({
  path: OUT,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
console.log("PDF_OK " + OUT);
await browser.close();
