/**
 * Reconcile the ledger against wallet balances, and append corrections.
 *
 * The demo seed used to credit every new account with spendable balances. Those
 * were wiped once a live withdrawal rail existed, by zeroing the wallets and
 * appending reversing ADJUSTMENT entries — but the sweep missed some accounts,
 * leaving their ledger history summing to a positive number while the wallet
 * reads zero.
 *
 * Nothing is spendable either way, so this is not a balance problem. It is an
 * audit-trail problem: the ledger is supposed to be the authoritative record,
 * and for those accounts it disagrees with reality.
 *
 * The fix is append-only. History is never edited or deleted — the correcting
 * entry IS the record of what happened, which is the entire point of keeping an
 * immutable ledger rather than a mutable balance column.
 *
 *   node scripts/reverse-unbacked-seed.mjs           # dry run, prints the plan
 *   node scripts/reverse-unbacked-seed.mjs --apply   # writes the entries
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "node:fs";

const APPLY = process.argv.includes("--apply");
const REF_ID = "seed-reversal-sweep-2026-08-27";
const EPSILON = 1e-8;

const line = fs
  .readFileSync(".env", "utf8")
  .split("\n")
  .find((l) => l.startsWith("DATABASE_URL="));
if (!line) {
  console.error("DATABASE_URL not found in .env — run this from the app directory.");
  process.exit(1);
}
const url = line.slice("DATABASE_URL=".length).replace(/^"|"$/g, "");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const sums = await prisma.ledgerEntry.groupBy({
  by: ["userId", "symbol"],
  where: { account: "AVAILABLE" },
  _sum: { delta: true },
});
const wallets = await prisma.wallet.findMany({
  select: { userId: true, symbol: true, balance: true },
});
const balanceOf = new Map(wallets.map((w) => [`${w.userId}|${w.symbol}`, Number(w.balance)]));

const fixes = [];
for (const s of sums) {
  const balance = balanceOf.get(`${s.userId}|${s.symbol}`) ?? 0;
  const ledger = Number(s._sum.delta ?? 0);
  if (Math.abs(ledger - balance) > EPSILON) {
    fixes.push({ userId: s.userId, symbol: s.symbol, ledger, balance, delta: balance - ledger });
  }
}

console.log(`pairs checked:  ${sums.length}`);
console.log(`mismatched:     ${fixes.length}`);
for (const f of fixes) {
  console.log(
    `  ${f.symbol.padEnd(5)} ledger ${String(f.ledger).padEnd(12)} wallet ${String(f.balance).padEnd(6)} → adjust ${f.delta}`,
  );
}

if (fixes.length === 0) {
  console.log("\nLedger already reconciles. Nothing to do.");
  await prisma.$disconnect();
  process.exit(0);
}

if (!APPLY) {
  console.log("\nDry run. Re-run with --apply to append these entries.");
  await prisma.$disconnect();
  process.exit(0);
}

// A prior run of this same sweep would carry the same refId; appending twice
// would double-correct and break what it set out to fix.
const already = await prisma.ledgerEntry.count({ where: { refId: REF_ID } });
if (already > 0) {
  console.error(`\nRefusing: ${already} entries already carry refId ${REF_ID}.`);
  await prisma.$disconnect();
  process.exit(1);
}

await prisma.ledgerEntry.createMany({
  data: fixes.map((f) => ({
    userId: f.userId,
    symbol: f.symbol,
    account: "AVAILABLE",
    delta: f.delta,
    balanceAfter: f.balance,
    type: "ADJUSTMENT",
    refId: REF_ID,
    memo: "Reverse unbacked demo seed missed by the earlier sweep",
  })),
});
console.log(`\nappended ${fixes.length} ADJUSTMENT entries`);

// Re-derive from the database rather than trusting the plan we just wrote.
const after = await prisma.ledgerEntry.groupBy({
  by: ["userId", "symbol"],
  where: { account: "AVAILABLE" },
  _sum: { delta: true },
});
let remaining = 0;
for (const s of after) {
  const balance = balanceOf.get(`${s.userId}|${s.symbol}`) ?? 0;
  if (Math.abs(Number(s._sum.delta ?? 0) - balance) > EPSILON) remaining++;
}
console.log(`remaining mismatches: ${remaining} of ${after.length} pairs`);
await prisma.$disconnect();
