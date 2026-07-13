import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  parseUnits,
  formatUnits,
  getAddress,
  isAddress,
  parseAbiItem,
  erc20Abi,
} from "viem";
import { sepolia } from "viem/chains";
import { mnemonicToAccount } from "viem/accounts";
import type { ChainAdapter, ChainConfig, OnChainDeposit, TokenConfig } from "./types";

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

function parseTokens(): TokenConfig[] {
  const raw = process.env.EVM_TOKENS;
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as TokenConfig[];
    return arr.map((t) => ({
      symbol: t.symbol,
      address: getAddress(t.address),
      decimals: t.decimals,
    }));
  } catch {
    return [];
  }
}

// EVM custody adapter. Points at Sepolia today; the same code runs on mainnet by
// changing EVM_RPC_URL + the viem chain. Clients are created lazily so the module
// is import-safe during build (no env required until a request actually uses it).
export class EvmAdapter implements ChainAdapter {
  readonly config: ChainConfig;
  private _pub?: ReturnType<typeof createPublicClient>;
  private _wallet?: ReturnType<typeof createWalletClient>;
  private _hot?: ReturnType<typeof mnemonicToAccount>;

  constructor() {
    this.config = {
      chain: process.env.EVM_CHAIN_NAME ?? "ethereum-sepolia",
      kind: "EVM",
      nativeSymbol: process.env.EVM_NATIVE_SYMBOL ?? "ETH",
      minConfirmations: Number(process.env.EVM_MIN_CONFIRMATIONS ?? 3),
      explorerTxUrl: (h) => `https://sepolia.etherscan.io/tx/${h}`,
      explorerAddressUrl: (a) => `https://sepolia.etherscan.io/address/${a}`,
      tokens: parseTokens(),
    };
  }

  private mnemonic(): string {
    const m = process.env.CUSTODY_MNEMONIC;
    if (!m) throw new Error("CUSTODY_MNEMONIC is not set");
    return m;
  }

  private pub() {
    if (!this._pub) {
      this._pub = createPublicClient({ chain: sepolia, transport: http(process.env.EVM_RPC_URL) });
    }
    return this._pub;
  }

  private hot() {
    if (!this._hot) this._hot = mnemonicToAccount(this.mnemonic(), { addressIndex: 0 });
    return this._hot;
  }

  private wallet() {
    if (!this._wallet) {
      this._wallet = createWalletClient({
        account: this.hot(),
        chain: sepolia,
        transport: http(process.env.EVM_RPC_URL),
      });
    }
    return this._wallet;
  }

  deriveAddress(index: number): string {
    return mnemonicToAccount(this.mnemonic(), { addressIndex: index }).address;
  }

  getBlockNumber(): Promise<bigint> {
    return this.pub().getBlockNumber();
  }

  async scanDeposits(
    watched: string[],
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<OnChainDeposit[]> {
    if (watched.length === 0 || toBlock < fromBlock) return [];
    const set = new Set(watched.map((a) => a.toLowerCase()));
    const out: OnChainDeposit[] = [];

    // Native ETH — inspect each block's transactions for transfers to us.
    for (let b = fromBlock; b <= toBlock; b++) {
      const block = await this.pub().getBlock({ blockNumber: b, includeTransactions: true });
      for (const tx of block.transactions) {
        if (tx.to && tx.value > BigInt(0) && set.has(tx.to.toLowerCase())) {
          out.push({
            symbol: this.config.nativeSymbol,
            amount: Number(formatEther(tx.value)),
            address: getAddress(tx.to),
            txHash: tx.hash,
            blockNumber: b,
          });
        }
      }
    }

    // ERC-20 tokens — filter Transfer logs whose `to` is one of our addresses.
    for (const token of this.config.tokens) {
      const logs = await this.pub().getLogs({
        address: token.address as `0x${string}`,
        event: TRANSFER_EVENT,
        args: { to: watched as `0x${string}`[] },
        fromBlock,
        toBlock,
      });
      for (const log of logs) {
        const to = log.args.to;
        const value = log.args.value;
        if (!to || value == null || !set.has(to.toLowerCase())) continue;
        out.push({
          symbol: token.symbol,
          amount: Number(formatUnits(value, token.decimals)),
          address: getAddress(to),
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        });
      }
    }
    return out;
  }

  async sendWithdrawal(symbol: string, to: string, amount: number): Promise<string> {
    const dest = getAddress(to);
    if (symbol === this.config.nativeSymbol) {
      return this.wallet().sendTransaction({
        account: this.hot(),
        chain: sepolia,
        to: dest,
        value: parseEther(String(amount)),
      });
    }
    const token = this.config.tokens.find((t) => t.symbol === symbol);
    if (!token) throw new Error(`Unsupported token for withdrawal: ${symbol}`);
    return this.wallet().writeContract({
      account: this.hot(),
      chain: sepolia,
      address: token.address as `0x${string}`,
      abi: erc20Abi,
      functionName: "transfer",
      args: [dest, parseUnits(String(amount), token.decimals)],
    });
  }

  validateAddress(address: string): boolean {
    return isAddress(address);
  }

  async getTransaction(
    txHash: string,
  ): Promise<{ mined: boolean; blockNumber: bigint; success: boolean }> {
    try {
      const r = await this.pub().getTransactionReceipt({ hash: txHash as `0x${string}` });
      return { mined: true, blockNumber: r.blockNumber, success: r.status === "success" };
    } catch {
      return { mined: false, blockNumber: BigInt(0), success: false };
    }
  }
}
