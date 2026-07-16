import "server-only";
import { Turnkey, DEFAULT_ETHEREUM_ACCOUNTS } from "@turnkey/sdk-server";

/**
 * Turnkey custody client (server-only). Turnkey holds the private keys in secure
 * enclaves and signs transactions via API — we never touch raw keys. Pairs with an
 * RPC provider (Infura/Alchemy) which broadcasts the signed tx and watches the chain.
 *
 * Env: TURNKEY_ORGANIZATION_ID, TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY.
 */
const TURNKEY_BASE_URL = process.env.TURNKEY_API_BASE_URL ?? "https://api.turnkey.com";

export function turnkeyConfigured(): boolean {
  return Boolean(
    process.env.TURNKEY_ORGANIZATION_ID &&
      process.env.TURNKEY_API_PUBLIC_KEY &&
      process.env.TURNKEY_API_PRIVATE_KEY,
  );
}

function apiClient() {
  const organizationId = process.env.TURNKEY_ORGANIZATION_ID;
  const apiPublicKey = process.env.TURNKEY_API_PUBLIC_KEY;
  const apiPrivateKey = process.env.TURNKEY_API_PRIVATE_KEY;
  if (!organizationId || !apiPublicKey || !apiPrivateKey) {
    throw new Error(
      "Turnkey is not configured — set TURNKEY_ORGANIZATION_ID, TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY.",
    );
  }
  return new Turnkey({
    apiBaseUrl: TURNKEY_BASE_URL,
    apiPublicKey,
    apiPrivateKey,
    defaultOrganizationId: organizationId,
  }).apiClient();
}

/** Confirm the API credentials authenticate against the org. */
export async function turnkeyWhoami() {
  return apiClient().getWhoami({
    organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  });
}

/** Create a custodial wallet with one Ethereum account; returns its id + address. */
export async function createEvmWallet(
  walletName: string,
): Promise<{ walletId: string; address: string }> {
  const res = await apiClient().createWallet({
    walletName,
    accounts: DEFAULT_ETHEREUM_ACCOUNTS,
  });
  const address = res.addresses[0];
  if (!address) throw new Error("Turnkey createWallet returned no address");
  return { walletId: res.walletId, address };
}

/** Sign an unsigned EVM transaction (hex, no 0x) with a custodial address. */
export async function signEvmTransaction(
  signWith: string,
  unsignedTransaction: string,
): Promise<string> {
  const res = await apiClient().signTransaction({
    signWith,
    unsignedTransaction,
    type: "TRANSACTION_TYPE_ETHEREUM",
  });
  return res.signedTransaction;
}
