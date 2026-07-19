import "server-only";
import { Turnkey, DEFAULT_ETHEREUM_ACCOUNTS, DEFAULT_SOLANA_ACCOUNTS } from "@turnkey/sdk-server";

// Bitcoin testnet native-segwit (BIP-84, P2WPKH) account for Turnkey wallet creation.
const BITCOIN_TESTNET_ACCOUNTS = [
  {
    curve: "CURVE_SECP256K1",
    pathFormat: "PATH_FORMAT_BIP32",
    path: "m/84'/1'/0'/0/0",
    addressFormat: "ADDRESS_FORMAT_BITCOIN_TESTNET_P2WPKH",
  },
] as const;

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

/** Create a custodial Solana wallet (ed25519); returns its id + base58 address. */
export async function createSolanaWallet(
  walletName: string,
): Promise<{ walletId: string; address: string }> {
  const res = await apiClient().createWallet({
    walletName,
    accounts: DEFAULT_SOLANA_ACCOUNTS,
  });
  const address = res.addresses[0];
  if (!address) throw new Error("Turnkey createWallet returned no Solana address");
  return { walletId: res.walletId, address };
}

/** Create a custodial Bitcoin (testnet, native segwit) wallet; returns its id + tb1 address. */
export async function createBitcoinWallet(
  walletName: string,
): Promise<{ walletId: string; address: string }> {
  const res = await apiClient().createWallet({
    walletName,
    accounts: BITCOIN_TESTNET_ACCOUNTS as unknown as typeof DEFAULT_ETHEREUM_ACCOUNTS,
  });
  const address = res.addresses[0];
  if (!address) throw new Error("Turnkey createWallet returned no Bitcoin address");
  return { walletId: res.walletId, address };
}

/** Sign an unsigned Solana transaction (hex message) with a custodial address. */
export async function signSolanaTransaction(
  signWith: string,
  unsignedTransaction: string,
): Promise<string> {
  const res = await apiClient().signTransaction({
    signWith,
    unsignedTransaction,
    type: "TRANSACTION_TYPE_SOLANA",
  });
  return res.signedTransaction;
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
