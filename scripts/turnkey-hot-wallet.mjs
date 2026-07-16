// Provisions the Turnkey EVM hot wallet that funds withdrawals. Run once on the VPS:
//   cd /home/opt/oknexus && set -a && . ./.env && set +a && node scripts/turnkey-hot-wallet.mjs
// Then set the printed address as TURNKEY_EVM_HOT_ADDRESS in .env and fund it from a
// Sepolia faucet (https://sepoliafaucet.com / https://faucet.quicknode.com/ethereum/sepolia).
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

const wallet = await client.createWallet({
  walletName: "oknexus:hot:ethereum",
  accounts: DEFAULT_ETHEREUM_ACCOUNTS,
});

const address = wallet.addresses[0];
console.log("HOT_WALLET_OK walletId=", wallet.walletId, "address=", address);
console.log("");
console.log("Next steps:");
console.log("  1) echo 'TURNKEY_EVM_HOT_ADDRESS=" + address + "' >> /home/opt/oknexus/.env");
console.log("  2) pm2 restart oknexus");
console.log("  3) Fund " + address + " from a Sepolia faucet, then withdrawals will broadcast on-chain.");
