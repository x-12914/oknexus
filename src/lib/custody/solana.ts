import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";
import { mnemonicToSeedSync } from "bip39";
import type { ChainAdapter, ChainConfig, OnChainDeposit } from "./types";

// Solana custody adapter (devnet today; mainnet-beta by changing SOL_RPC_URL).
// Account model — deposits are found by scanning each address's recent
// signatures and taking the net lamport delta, which catches airdrops and
// transfers alike. Clients are created lazily so the module is import-safe.
export class SolanaAdapter implements ChainAdapter {
  readonly config: ChainConfig;
  private _conn?: Connection;

  constructor() {
    this.config = {
      chain: process.env.SOL_CHAIN_NAME ?? "solana-devnet",
      kind: "SOL",
      nativeSymbol: "SOL",
      minConfirmations: Number(process.env.SOL_MIN_CONFIRMATIONS ?? 1),
      explorerTxUrl: (h) => `https://explorer.solana.com/tx/${h}?cluster=devnet`,
      explorerAddressUrl: (a) => `https://explorer.solana.com/address/${a}?cluster=devnet`,
      tokens: [],
    };
  }

  private mnemonic(): string {
    const m = process.env.CUSTODY_MNEMONIC;
    if (!m) throw new Error("CUSTODY_MNEMONIC is not set");
    return m;
  }

  private conn(): Connection {
    if (!this._conn) {
      this._conn = new Connection(
        process.env.SOL_RPC_URL ?? "https://api.devnet.solana.com",
        "confirmed",
      );
    }
    return this._conn;
  }

  private keypair(index: number): Keypair {
    const seed = mnemonicToSeedSync(this.mnemonic(), "");
    const { key } = derivePath(`m/44'/501'/${index}'/0'`, seed.toString("hex"));
    return Keypair.fromSeed(key);
  }

  deriveAddress(index: number): string {
    return this.keypair(index).publicKey.toBase58();
  }

  async getBlockNumber(): Promise<bigint> {
    return BigInt(await this.conn().getSlot());
  }

  async scanDeposits(watched: string[]): Promise<OnChainDeposit[]> {
    const out: OnChainDeposit[] = [];
    for (const addr of watched) {
      let sigs;
      try {
        sigs = await this.conn().getSignaturesForAddress(new PublicKey(addr), { limit: 15 });
      } catch {
        continue;
      }
      for (const s of sigs) {
        if (s.err) continue;
        const tx = await this.conn().getParsedTransaction(s.signature, {
          maxSupportedTransactionVersion: 0,
        });
        if (!tx?.meta) continue;
        const keys = tx.transaction.message.accountKeys.map((k) => k.pubkey.toBase58());
        const idx = keys.indexOf(addr);
        if (idx < 0) continue;
        const delta = (tx.meta.postBalances[idx] - tx.meta.preBalances[idx]) / LAMPORTS_PER_SOL;
        if (delta > 0) {
          out.push({
            symbol: "SOL",
            amount: delta,
            address: addr,
            txHash: s.signature,
            blockNumber: BigInt(s.slot),
          });
        }
      }
    }
    return out;
  }

  async sendWithdrawal(symbol: string, to: string, amount: number): Promise<string> {
    if (symbol !== "SOL") throw new Error(`Unsupported token for withdrawal: ${symbol}`);
    const from = this.keypair(0);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: new PublicKey(to),
        lamports: Math.round(amount * LAMPORTS_PER_SOL),
      }),
    );
    return sendAndConfirmTransaction(this.conn(), tx, [from], { commitment: "confirmed" });
  }

  validateAddress(address: string): boolean {
    try {
      return !!new PublicKey(address);
    } catch {
      return false;
    }
  }

  async getTransaction(
    txHash: string,
  ): Promise<{ mined: boolean; blockNumber: bigint; success: boolean }> {
    const tx = await this.conn().getParsedTransaction(txHash, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) return { mined: false, blockNumber: BigInt(0), success: false };
    return { mined: true, blockNumber: BigInt(tx.slot), success: tx.meta?.err == null };
  }
}
