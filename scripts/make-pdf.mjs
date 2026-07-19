import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const IN =
  "C:\\Users\\xxx85\\AppData\\Local\\Temp\\claude\\C--Users-xxx85-Downloads-trading-proj\\dbfb465d-f02a-4604-8718-2554414efc50\\scratchpad\\wallet-model-print.html";
const OUT = "C:\\Users\\xxx85\\Downloads\\trading proj\\Nexus-Platform-Wallet-Options.pdf";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
await page.setContent(readFileSync(IN, "utf8"), { waitUntil: "networkidle0" });
await page.pdf({ path: OUT, printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log("PDF_WRITTEN", OUT);
