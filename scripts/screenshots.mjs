import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:3000";
const OUT = "C:\\Users\\xxx85\\Downloads\\trading proj\\screenshots";
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// React-friendly input setter (bypasses React's value tracking).
async function setInput(page, selector, value) {
  await page.evaluate(
    (sel, val) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      ).set;
      setter.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    },
    selector,
    value,
  );
}

async function clickByText(page, text) {
  await page.evaluate((t) => {
    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent.trim() === t,
    );
    if (btn && !btn.disabled) btn.click();
  }, text);
}

const pages = [
  {
    file: "1-spot-trading.png",
    url: "/trade/BTC-USDT",
    prep: async (page) => sleep(5000), // let market data poll in
  },
  {
    file: "2-instant-swap.png",
    url: "/swap",
    prep: async (page) => {
      await sleep(1500);
      await setInput(page, 'input[placeholder="0.0"]', "1000");
      await sleep(2000);
    },
  },
  {
    file: "3-crypto-ramp.png",
    url: "/buy",
    prep: async (page) => {
      await sleep(1500);
      await setInput(page, 'input[placeholder="0.00"]', "250");
      await sleep(2000);
    },
  },
  {
    file: "4-otc-desk.png",
    url: "/otc",
    prep: async (page) => {
      await sleep(1500);
      await setInput(page, 'input[placeholder="0.0"]', "10");
      await sleep(700);
      await clickByText(page, "Request Quote");
      await sleep(2000);
    },
  },
  {
    file: "5-p2p-marketplace.png",
    url: "/p2p",
    prep: async (page) => sleep(2500),
  },
  {
    file: "6-p2p-trade.png",
    url: "/p2p",
    prep: async (page) => {
      await sleep(2500);
      // Open a trade and walk it into the escrow view.
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll("button")).find(
          (x) => x.textContent.trim() === "Buy USDT",
        );
        b?.click();
      });
      await sleep(800);
      await setInput(page, 'input[placeholder="0.00"]', "1000");
      await sleep(500);
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll("button")).find((x) =>
          /^Buy 999/.test(x.textContent.trim()),
        );
        b?.click();
      });
      await sleep(2500); // navigate to the order page
    },
  },
  { file: "7-dashboard.png", url: "/dashboard", prep: async () => sleep(1500) },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
});

const page = await browser.newPage();
for (const p of pages) {
  try {
    await page.goto(BASE + p.url, { waitUntil: "networkidle2", timeout: 30000 });
    await p.prep(page);
    const path = `${OUT}\\${p.file}`;
    await page.screenshot({ path, type: "png" });
    console.log(`OK  ${p.file}  <- ${p.url}`);
  } catch (e) {
    console.log(`ERR ${p.file}  ${e.message}`);
  }
}

await browser.close();
console.log(`\nSaved to: ${OUT}`);
