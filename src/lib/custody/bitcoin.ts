import * as bitcoin from "bitcoinjs-lib";
import BIP32Factory from "bip32";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";
import { mnemonicToSeedSync } from "bip39";
import type { ChainAdapter, ChainConfig, OnChainDeposit } from "./types";

bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);
const NETWORK = bitcoin.networks.testnet;
const SATS = 100_000_000;

// Bitcoin testnet custody via Blockstream Esplora (no node, no key). UTXO model:
// deposits are read from address history; withdrawals build + sign a PSBT from
// the hot wallet's UTXOs and broadcast the raw tx. BIP-84 native segwit (tb1…).
export class BitcoinAdapter implements ChainAdapter {
  readonly config: ChainConfig;
  private readonly base: string;

  constructor() {
    this.base = process.env.BTC_ESPLORA_URL ?? "https://blockstream.info/testnet/api";
    this.config = {
      chain: process.env.BTC_CHAIN_NAME ?? "bitcoin-testnet",
      kind: "BTC",
      nativeSymbol: "BTC",
      minConfirmations: Number(process.env.BTC_MIN_CONFIRMATIONS ?? 1),
      explorerTxUrl: (h) => `https://blockstream.info/testnet/tx/${h}`,
      explorerAddressUrl: (a) => `https://blockstream.info/testnet/address/${a}`,
      tokens: [],
    };
  }

  private mnemonic(): string {
    const m = process.env.CUSTODY_MNEMONIC;
    if (!m) throw new Error("CUSTODY_MNEMONIC is not set");
    return m;
  }

  private node(index: number) {
    const seed = mnemonicToSeedSync(this.mnemonic(), "");
    return bip32.fromSeed(seed, NETWORK).derivePath(`m/84'/1'/0'/0/${index}`);
  }

  private p2wpkh(pubkey: Uint8Array) {
    return bitcoin.payments.p2wpkh({ pubkey, network: NETWORK });
  }

  deriveAddress(index: number): string {
    const addr = this.p2wpkh(this.node(index).publicKey).address;
    if (!addr) throw new Error("Failed to derive BTC address");
    return addr;
  }

  async getBlockNumber(): Promise<bigint> {
    const h = await fetch(`${this.base}/blocks/tip/height`).then((r) => r.text());
    return BigInt(h.trim());
  }

  async scanDeposits(
    watched: string[],
    _fromBlock: bigint,
    _toBlock: bigint,
  ): Promise<OnChainDeposit[]> {
    // Esplora is address-indexed, so we scan per address rather than by block
    // range. Only confirmed txs are returned; the scanner dedupes by txid.
    const out: OnChainDeposit[] = [];
    for (const addr of watched) {
      let txs: EsploraTx[] = [];
      try {
        txs = await fetch(`${this.base}/address/${addr}/txs`).then((r) => r.json());
      } catch {
        continue;
      }
      for (const tx of txs) {
        if (!tx.status?.confirmed || tx.status.block_height == null) continue;
        let sats = 0;
        for (const vout of tx.vout) {
          if (vout.scriptpubkey_address === addr) sats += vout.value;
        }
        if (sats > 0) {
          out.push({
            symbol: "BTC",
            amount: sats / SATS,
            address: addr,
            txHash: tx.txid,
            blockNumber: BigInt(tx.status.block_height),
          });
        }
      }
    }
    return out;
  }

  async sendWithdrawal(symbol: string, to: string, amount: number): Promise<string> {
    if (symbol !== "BTC") throw new Error(`Unsupported asset for BTC chain: ${symbol}`);
    const sats = Math.round(amount * SATS);
    const hot = this.node(0);
    const pay = this.p2wpkh(hot.publicKey);
    const hotAddr = pay.address!;
    const script = pay.output!;
    const signer = ECPair.fromPrivateKey(hot.privateKey!, { network: NETWORK });

    const utxos: EsploraUtxo[] = await fetch(`${this.base}/address/${hotAddr}/utxo`).then((r) =>
      r.json(),
    );
    const confirmed = utxos.filter((u) => u.status?.confirmed).sort((a, b) => b.value - a.value);

    const feeRates: Record<string, number> = await fetch(`${this.base}/fee-estimates`)
      .then((r) => r.json())
      .catch(() => ({}));
    const feeRate = Math.max(1, Math.ceil(feeRates["6"] ?? feeRates["3"] ?? feeRates["1"] ?? 2));

    // Greedy UTXO selection covering amount + fee.
    const used: EsploraUtxo[] = [];
    let inSats = 0;
    const feeFor = (n: number) => (10 + n * 68 + 2 * 31) * feeRate;
    for (const u of confirmed) {
      used.push(u);
      inSats += u.value;
      if (inSats >= sats + feeFor(used.length)) break;
    }
    const fee = feeFor(used.length);
    if (inSats < sats + fee) {
      throw new Error("Insufficient hot-wallet balance for this withdrawal");
    }

    const psbt = new bitcoin.Psbt({ network: NETWORK });
    for (const u of used) {
      psbt.addInput({ hash: u.txid, index: u.vout, witnessUtxo: { script, value: BigInt(u.value) } });
    }
    psbt.addOutput({ address: to, value: BigInt(sats) });
    const change = inSats - sats - fee;
    if (change > 546) psbt.addOutput({ address: hotAddr, value: BigInt(change) }); // above dust

    used.forEach((_, i) => psbt.signInput(i, signer));
    psbt.finalizeAllInputs();
    const txHex = psbt.extractTransaction().toHex();

    const res = await fetch(`${this.base}/tx`, { method: "POST", body: txHex });
    const body = await res.text();
    if (!res.ok) throw new Error(`Broadcast failed: ${body.slice(0, 160)}`);
    return body.trim();
  }

  validateAddress(address: string): boolean {
    try {
      bitcoin.address.toOutputScript(address, NETWORK);
      return true;
    } catch {
      return false;
    }
  }

  async getTransaction(
    txHash: string,
  ): Promise<{ mined: boolean; blockNumber: bigint; success: boolean }> {
    try {
      const tx: EsploraTx = await fetch(`${this.base}/tx/${txHash}`).then((r) => r.json());
      if (tx?.status?.confirmed && tx.status.block_height != null) {
        return { mined: true, blockNumber: BigInt(tx.status.block_height), success: true };
      }
    } catch {
      // fall through
    }
    return { mined: false, blockNumber: BigInt(0), success: false };
  }
}

interface EsploraTx {
  txid: string;
  status?: { confirmed: boolean; block_height?: number };
  vout: { value: number; scriptpubkey_address?: string }[];
}

interface EsploraUtxo {
  txid: string;
  vout: number;
  value: number;
  status?: { confirmed: boolean };
}
