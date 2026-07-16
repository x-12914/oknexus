// Verifies Turnkey credentials end-to-end. Run on the VPS AFTER the keys are in .env:
//   cd /home/opt/oknexus && set -a && . ./.env && set +a && node scripts/verify-turnkey.mjs
// It authenticates (whoami) and creates one test wallet, printing its ETH address.
import { Turnkey, DEFAULT_ETHEREUM_ACCOUNTS } from "@turnkey/sdk-server";

const { TURNKEY_ORGANIZATION_ID, TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY } = process.env;

if (!TURNKEY_ORGANIZATION_ID || !TURNKEY_API_PUBLIC_KEY || !TURNKEY_API_PRIVATE_KEY) {
  console.error("MISSING Turnkey env (TURNKEY_ORGANIZATION_ID / _API_PUBLIC_KEY / _API_PRIVATE_KEY)");
  process.exit(1);
}

const client = new Turnkey({
  apiBaseUrl: process.env.TURNKEY_API_BASE_URL ?? "https://api.turnkey.com",
  apiPublicKey: TURNKEY_API_PUBLIC_KEY,
  apiPrivateKey: TURNKEY_API_PRIVATE_KEY,
  defaultOrganizationId: TURNKEY_ORGANIZATION_ID,
}).apiClient();

const who = await client.getWhoami({ organizationId: TURNKEY_ORGANIZATION_ID });
console.log("WHOAMI_OK org=", who.organizationId, "user=", who.userId ?? "(api key)");

const wallet = await client.createWallet({
  walletName: "verify-" + process.pid + "-" + Math.floor(process.hrtime()[0]),
  accounts: DEFAULT_ETHEREUM_ACCOUNTS,
});
console.log("WALLET_OK id=", wallet.walletId, "address=", wallet.addresses[0]);
