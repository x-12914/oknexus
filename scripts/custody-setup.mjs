// One-shot VPS custody setup. Run from /home/opt/oknexus (viem must resolve).
// Generates the HD seed + cron secret IN PLACE (never printed), sets Sepolia
// config, installs the minute cron, and prints only the public hot-wallet
// address (fund it from a faucet) + which keys were added.
import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import { generateMnemonic, english, mnemonicToAccount } from "viem/accounts";

const ENV = ".env";
let env = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
const has = (k) => new RegExp(`^${k}=`, "m").test(env);
const nl = () => (env === "" || env.endsWith("\n") ? "" : "\n");
const added = [];

function ensure(k, v) {
  if (!has(k)) {
    env += `${nl()}${k}=${v}\n`;
    added.push(k);
  }
}

if (!has("CUSTODY_MNEMONIC")) {
  env += `${nl()}CUSTODY_MNEMONIC="${generateMnemonic(english)}"\n`;
  added.push("CUSTODY_MNEMONIC");
}
ensure("EVM_RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com");
ensure("EVM_CHAIN_NAME", "ethereum-sepolia");
ensure("EVM_NATIVE_SYMBOL", "ETH");
ensure("EVM_MIN_CONFIRMATIONS", "2");
ensure("CRON_SECRET", randomBytes(24).toString("hex"));
writeFileSync(ENV, env);

// Install the deposit/withdrawal cron (reads the secret from .env at run time).
const cron = `#!/usr/bin/env bash
set -a; source /home/opt/oknexus/.env; set +a
curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/custody/cron >/dev/null 2>&1
`;
writeFileSync("/home/opt/oknexus/custody-cron.sh", cron);
chmodSync("/home/opt/oknexus/custody-cron.sh", 0o755);
try {
  execSync(
    `(crontab -l 2>/dev/null | grep -v custody-cron.sh; echo "* * * * * /home/opt/oknexus/custody-cron.sh") | crontab -`,
    { shell: "/bin/bash" },
  );
  console.log("CRON: installed (every minute)");
} catch (e) {
  console.log("CRON_ERR:", e.message);
}

const m = (readFileSync(ENV, "utf8").match(/CUSTODY_MNEMONIC="?([^"\n]+)/) || [])[1];
console.log("ADDED:", added.join(", ") || "(nothing new)");
console.log("HOT_WALLET:", mnemonicToAccount(m, { addressIndex: 0 }).address);
