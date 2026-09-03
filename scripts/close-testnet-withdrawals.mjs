/**
 * Close out withdrawal rows left behind on test networks.
 *
 * Custody moved from Sepolia and Solana devnet to Ethereum mainnet. The
 * withdrawal processor only walks the chains that are enabled, so rows that
 * were BROADCAST on the old networks will never be confirmed or failed by it:
 * they sit in an in-flight state forever and mislead anyone reading history.
 *
 * This checks each one against the public test-network RPC and records what
 * actually happened: CONFIRMED where the transaction mined successfully,
 * FAILED otherwise. It never touches the ledger. Those balances were test-era
 * demo money and were already reversed by the seed-reversal sweep; crediting
 * anything back here would create real liability out of test funds.
 *
 *   node scripts/close-testnet-withdrawals.mjs           # dry run, prints the plan
 *   node scripts/close-testnet-withdrawals.mjs --apply   # writes the statuses
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "node:fs";

const APPLY = process.argv.includes("--apply");
const NOTE = "Closed by close-testnet-withdrawals: test network no longer served; no ledger effect";
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
const DEVNET_RPC = process.env.SOL_DEVNET_RPC_URL ?? "https://api.devnet.solana.com";

const line = fs
  .readFileSync(".env", "utf8")
  .split("\n")
  .find((l) => l.startsWith("DATABASE_URL="));
if (!line) {
  console.error("DATABASE_URL not found in .env; run this from the app directory.");
  process.exit(1);
}
const url = line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function rpc(endpoint, method, params) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message ?? "rpc error");
  return body.result;
}

/** "CONFIRMED" | "FAILED" | "UNKNOWN" for a Sepolia tx hash. */
async function sepoliaOutcome(hash) {
  if (!hash) return "FAILED";
  try {
    const r = await rpc(SEPOLIA_RPC, "eth_getTransactionReceipt", [hash]);
    if (!r) return "UNKNOWN"; // never mined, or pruned
    return r.status === "0x1" ? "CONFIRMED" : "FAILED";
  } catch {
    return "UNKNOWN";
  }
}

/** Same, for a Solana devnet signature. */
async function devnetOutcome(sig) {
  if (!sig) return "FAILED";
  try {
    const r = await rpc(DEVNET_RPC, "getSignatureStatuses", [[sig], { searchTransactionHistory: true }]);
    const s = r?.value?.[0];
    if (!s) return "UNKNOWN";
    if (s.err) return "FAILED";
    return s.confirmationStatus === "finalized" || s.confirmationStatus === "confirmed" ? "CONFIRMED" : "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

const rows = await prisma.withdrawal.findMany({
  where: {
    status: { in: ["REQUESTED", "BROADCAST", "PENDING_APPROVAL"] },
    OR: [{ chain: { contains: "sepolia" } }, { chain: { contains: "devnet" } }, { chain: { contains: "testnet" } }],
  },
  select: { id: true, chain: true, symbol: true, amount: true, txHash: true, status: true, createdAt: true },
  orderBy: { createdAt: "asc" },
});

console.log(`${rows.length} in-flight withdrawal(s) on test networks`);
const plan = [];
for (const w of rows) {
  const outcome = w.chain.includes("sepolia")
    ? await sepoliaOutcome(w.txHash)
    : w.chain.includes("devnet")
      ? await devnetOutcome(w.txHash)
      : "UNKNOWN";
  // Unknown after a month on a test network means it never went through.
  const status = outcome === "CONFIRMED" ? "CONFIRMED" : "FAILED";
  plan.push({ id: w.id, chain: w.chain, from: w.status, to: status, checked: outcome });
}

const summary = {};
for (const p of plan) summary[`${p.chain}: ${p.from} -> ${p.to} (${p.checked})`] = (summary[`${p.chain}: ${p.from} -> ${p.to} (${p.checked})`] ?? 0) + 1;
console.table(summary);

if (!APPLY) {
  console.log("Dry run. Re-run with --apply to write these statuses. The ledger is never touched.");
  await prisma.$disconnect();
  process.exit(0);
}

let written = 0;
for (const p of plan) {
  const r = await prisma.withdrawal.updateMany({
    where: { id: p.id, status: p.from },
    data: { status: p.to, error: p.to === "FAILED" ? NOTE : null },
  });
  written += r.count;
}
console.log(`Updated ${written} row(s).`);
await prisma.$disconnect();
