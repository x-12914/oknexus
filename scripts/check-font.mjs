import puppeteer from "puppeteer-core";
const CHROME = "C:\Program Files\Google\Chrome\Application\chrome.exe";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--host-resolver-rules=MAP oknexusexchange.com 162.35.175.166", "--ignore-certificate-errors"] });
const p = await b.newPage();
await p.goto("https://oknexusexchange.com/", { waitUntil: "domcontentloaded" });
const font = await p.evaluate(() => getComputedStyle(document.body).fontFamily);
console.log("BODY_FONT:", font);
await b.close();
