import { createPublicClient, http, formatEther } from "viem";
import { sepolia } from "viem/chains";

const c = createPublicClient({
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
});
const addr = "0xA7E4cE3cCE44EbA27f238f6E822F2C6E1c6d7e1B";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (let i = 0; i < 8; i++) {
  const bal = await c.getBalance({ address: addr });
  console.log(`[check ${i + 1}] ${formatEther(bal)} ETH`);
  if (bal > 0n) {
    console.log("FUNDED", formatEther(bal), "ETH");
    process.exit(0);
  }
  await sleep(20000);
}
console.log("STILL_ZERO");
