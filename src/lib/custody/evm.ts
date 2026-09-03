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
  encodeFunctionData,
  serializeTransaction,
  erc20Abi,
} from "viem";
import { sepolia, mainnet } from "viem/chains";
import { mnemonicToAccount } from "viem/accounts";
import type { ChainAdapter, ChainConfig, OnChainDeposit, TokenConfig } from "./types";
import { turnkeyConfigured, signEvmTransaction } from "@/lib/turnkey";

/**
 * The hot wallet cannot cover a gas top-up. Typed so the sweep can stop for the
 * pass on the first occurrence instead of failing identically per address.
 */
export class HotWalletEmptyError extends Error {
  constructor(readonly needWei: bigint, readonly haveWei: bigint) {
    super(
      `Hot wallet holds ${formatEther(haveWei)} ETH but a gas top-up needs ${formatEther(needWei)} ETH`,
    );
  }
}

export type TokenSweepOutcome =
  | { kind: "swept"; txHash: string; amount: number }
  /** Gas was sent to the address; the token moves on the next pass. */
  | { kind: "funded"; txHash: string; wei: bigint }
  | null;

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

// Network selection: Sepolia by default. Set EVM_NETWORK=mainnet to run on Ethereum
// mainnet — REAL FUNDS: also point INFURA_API_KEY at a mainnet key and fund the hot
// wallet with real ETH. Production stays on Sepolia until this env var is set.
const IS_MAINNET = process.env.EVM_NETWORK === "mainnet";
// Mainnet waits for 12 confirmations by default rather than 3: a reorg that
// costs nothing on a testnet costs a real credit here. Override deliberately.
const CHAIN = IS_MAINNET ? mainnet : sepolia;
const INFURA_HOST = IS_MAINNET ? "mainnet.infura.io" : "sepolia.infura.io";
const EXPLORER = IS_MAINNET ? "https://etherscan.io" : "https://sepolia.etherscan.io";

/** RPC endpoint — prefers Infura (the client's chosen provider) when INFURA_API_KEY is set. */
function evmRpcUrl(): string | undefined {
  if (process.env.INFURA_API_KEY) return `https://${INFURA_HOST}/v3/${process.env.INFURA_API_KEY}`;
  return process.env.EVM_RPC_URL;
}

/**
 * Read EVM_TOKENS. Accepts strict JSON and the quote-stripped form a shell
 * leaves behind (`[{symbol:USDT,address:0x...,decimals:6}]`), because that is
 * exactly what happened in production: the value was pasted without quotes,
 * this returned [] silently, and no stablecoin deposit was scanned for weeks.
 * Returns null when the value is set but cannot be read, so monitoring can say so.
 */
export function parseTokenList(raw: string): TokenConfig[] | null {
  const relaxed = raw
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/:\s*([A-Za-z0-9_]+)\s*([,}])/g, ':"$1"$2');
  for (const attempt of [raw, relaxed]) {
    try {
      const arr = JSON.parse(attempt) as { symbol?: unknown; address?: unknown; decimals?: unknown }[];
      if (!Array.isArray(arr)) continue;
      const out: TokenConfig[] = [];
      for (const t of arr) {
        const symbol = String(t.symbol ?? "").toUpperCase();
        const decimals = Number(t.decimals);
        if (!symbol || !Number.isInteger(decimals)) return null;
        out.push({ symbol, address: getAddress(String(t.address)), decimals });
      }
      return out;
    } catch {
      // try the next form
    }
  }
  return null;
}

/** True when EVM_TOKENS is set but unreadable: tokens are configured and yet none will be scanned. */
export function tokensMisconfigured(): boolean {
  const raw = process.env.EVM_TOKENS;
  return Boolean(raw) && parseTokenList(raw!) === null;
}

function parseTokens(): TokenConfig[] {
  const raw = process.env.EVM_TOKENS;
  if (!raw) return [];
  const list = parseTokenList(raw);
  if (list === null) {
    console.error("[custody] EVM_TOKENS is set but could not be parsed; no ERC-20 deposits will be scanned");
    return [];
  }
  return list;
}

// EVM custody adapter. Points at Sepolia today; the same code runs on mainnet by
// changing the RPC + the viem chain. Two withdrawal backends:
//  - Turnkey (when configured): build unsigned tx → Turnkey signs → broadcast via Infura.
//  - HD hot wallet (fallback): viem signs locally with the custody-seed account 0.
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
      testnet: !IS_MAINNET,
      minConfirmations: Number(process.env.EVM_MIN_CONFIRMATIONS ?? (IS_MAINNET ? 12 : 3)),
      explorerTxUrl: (h) => `${EXPLORER}/tx/${h}`,
      explorerAddressUrl: (a) => `${EXPLORER}/address/${a}`,
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
      this._pub = createPublicClient({ chain: CHAIN, transport: http(evmRpcUrl()) });
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
        chain: CHAIN,
        transport: http(evmRpcUrl()),
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
    if (turnkeyConfigured()) {
      return this.sendTurnkeyWithdrawal(symbol, dest, amount);
    }
    // Fallback: sign locally with the HD hot wallet (account 0).
    if (symbol === this.config.nativeSymbol) {
      return this.wallet().sendTransaction({
        account: this.hot(),
        chain: CHAIN,
        to: dest,
        value: parseEther(String(amount)),
      });
    }
    const token = this.config.tokens.find((t) => t.symbol === symbol);
    if (!token) throw new Error(`Unsupported token for withdrawal: ${symbol}`);
    return this.wallet().writeContract({
      account: this.hot(),
      chain: CHAIN,
      address: token.address as `0x${string}`,
      abi: erc20Abi,
      functionName: "transfer",
      args: [dest, parseUnits(String(amount), token.decimals)],
    });
  }

  /** The Turnkey-controlled hot wallet that funds withdrawals. */
  private turnkeyHotAddress(): `0x${string}` {
    const a = process.env.TURNKEY_EVM_HOT_ADDRESS;
    if (!a) {
      throw new Error(
        "TURNKEY_EVM_HOT_ADDRESS is not set — provision the hot wallet (scripts/turnkey-hot-wallet.mjs), " +
          "set it in .env, and fund it from a Sepolia faucet.",
      );
    }
    return getAddress(a);
  }

  /** Withdraw via Turnkey: build an unsigned tx, have Turnkey sign it, broadcast via Infura. */
  private async sendTurnkeyWithdrawal(
    symbol: string,
    dest: `0x${string}`,
    amount: number,
  ): Promise<string> {
    const from = this.turnkeyHotAddress();
    const pub = this.pub();

    let to: `0x${string}`;
    let value: bigint;
    let data: `0x${string}` | undefined;
    if (symbol === this.config.nativeSymbol) {
      to = dest;
      value = parseEther(String(amount));
    } else {
      const token = this.config.tokens.find((t) => t.symbol === symbol);
      if (!token) throw new Error(`Unsupported token for withdrawal: ${symbol}`);
      to = token.address as `0x${string}`;
      value = BigInt(0);
      data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [dest, parseUnits(String(amount), token.decimals)],
      });
    }

    const [nonce, fees] = await Promise.all([
      pub.getTransactionCount({ address: from, blockTag: "pending" }),
      pub.estimateFeesPerGas(),
    ]);
    let gas: bigint;
    try {
      gas = await pub.estimateGas({ account: from, to, value, data });
    } catch {
      gas = data ? BigInt(100000) : BigInt(21000);
    }

    const unsigned = serializeTransaction({
      chainId: CHAIN.id,
      type: "eip1559",
      nonce,
      to,
      value,
      data,
      gas,
      maxFeePerGas: fees.maxFeePerGas,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
    });
    const signed = await signEvmTransaction(from, unsigned.slice(2));
    const serializedTransaction = (signed.startsWith("0x") ? signed : `0x${signed}`) as `0x${string}`;
    return pub.sendRawTransaction({ serializedTransaction });
  }

  /**
   * Sweep the native balance of a per-user Turnkey deposit address into the hot
   * wallet (so the hot wallet can fund withdrawals). Turnkey signs for the address;
   * gas is paid from the swept balance, leaving only dust. Native ETH only.
   */
  async sweepNativeToHot(
    from: `0x${string}`,
  ): Promise<{ txHash: string; amount: number } | null> {
    const hot = this.turnkeyHotAddress();
    if (from.toLowerCase() === hot.toLowerCase()) return null;

    const pub = this.pub();
    const [balance, fees] = await Promise.all([
      pub.getBalance({ address: from }),
      pub.estimateFeesPerGas(),
    ]);
    const gas = BigInt(21000);
    const gasCost = gas * fees.maxFeePerGas;
    const minSweep = parseEther(process.env.EVM_MIN_SWEEP ?? "0.002");
    // Only sweep when it covers gas and leaves a worthwhile amount behind.
    if (balance <= gasCost + minSweep) return null;

    const value = balance - gasCost;
    const nonce = await pub.getTransactionCount({ address: from, blockTag: "pending" });
    const unsigned = serializeTransaction({
      chainId: CHAIN.id,
      type: "eip1559",
      nonce,
      to: hot,
      value,
      gas,
      maxFeePerGas: fees.maxFeePerGas,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
    });
    const signed = await signEvmTransaction(from, unsigned.slice(2));
    const serializedTransaction = (signed.startsWith("0x") ? signed : `0x${signed}`) as `0x${string}`;
    const txHash = await pub.sendRawTransaction({ serializedTransaction });
    return { txHash, amount: Number(formatEther(value)) };
  }

  /**
   * Sweep one ERC-20 balance from a per-user deposit address into the hot wallet.
   *
   * The catch with tokens is that moving them costs ETH, and a deposit address
   * that only ever received USDT has none. So this is a two-step machine spread
   * across cron passes:
   *
   *   pass N    address has the token but not the gas -> hot wallet sends the
   *             shortfall, and we return "funded"
   *   pass N+1  address now has gas -> it signs the transfer, we return "swept"
   *
   * Not waiting for the top-up to confirm is deliberate. A minute of treasury
   * latency costs nothing; a receipt wait inside a once-a-minute cron is a
   * timeout waiting to happen. The pending-balance read is what stops pass N+1
   * from funding again while pass N's top-up is still in the mempool.
   *
   * Every leg is signed by Turnkey for the address that pays, exactly as the
   * native sweep is. The existing sendWithdrawal and sweepNativeToHot paths are
   * untouched: both have moved real funds and this shares no code with them.
   */
  async sweepTokenToHot(
    from: `0x${string}`,
    token: TokenConfig,
  ): Promise<TokenSweepOutcome> {
    const hot = this.turnkeyHotAddress();
    if (from.toLowerCase() === hot.toLowerCase()) return null;
    const pub = this.pub();
    const contract = token.address as `0x${string}`;

    const balance = (await pub.readContract({
      address: contract,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [from],
    })) as bigint;
    // Below this it costs more in gas than it moves. Denominated in the token,
    // which for the stablecoins this exists for means dollars.
    const minSweep = parseUnits(process.env.EVM_MIN_TOKEN_SWEEP ?? "10", token.decimals);
    if (balance < minSweep) return null;

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [hot, balance],
    });
    const fees = await pub.estimateFeesPerGas();
    let gas: bigint;
    try {
      gas = await pub.estimateGas({ account: from, to: contract, data });
    } catch {
      // A node may refuse to simulate for an account with no ETH. 100k covers
      // every mainstream ERC-20 transfer with room to spare.
      gas = BigInt(100000);
    }
    const gasCost = gas * fees.maxFeePerGas;

    // Pending, not latest: a top-up sent last pass may not be mined yet, and
    // reading the confirmed balance would fund it a second time.
    const ethPending = await pub.getBalance({ address: from, blockTag: "pending" });

    if (ethPending < gasCost) {
      // Send the shortfall plus a fifth, since fees move between now and the
      // sweep. Whatever is left over is dust at an address we control.
      const target = (gasCost * BigInt(120)) / BigInt(100);
      const shortfall = target - ethPending;
      const topUpGas = BigInt(21000);
      const hotBalance = await pub.getBalance({ address: hot });
      const hotNeeds = shortfall + topUpGas * fees.maxFeePerGas;
      if (hotBalance < hotNeeds) throw new HotWalletEmptyError(hotNeeds, hotBalance);

      const txHash = await this.sendSigned(hot, {
        to: from,
        value: shortfall,
        gas: topUpGas,
        fees,
      });
      return { kind: "funded", txHash, wei: shortfall };
    }

    const txHash = await this.sendSigned(from, { to: contract, value: BigInt(0), data, gas, fees });
    return { kind: "swept", txHash, amount: Number(formatUnits(balance, token.decimals)) };
  }

  /** Build, Turnkey-sign and broadcast one EIP-1559 transaction from `from`. */
  private async sendSigned(
    from: `0x${string}`,
    tx: {
      to: `0x${string}`;
      value: bigint;
      gas: bigint;
      data?: `0x${string}`;
      fees: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint };
    },
  ): Promise<string> {
    const pub = this.pub();
    const nonce = await pub.getTransactionCount({ address: from, blockTag: "pending" });
    const unsigned = serializeTransaction({
      chainId: CHAIN.id,
      type: "eip1559",
      nonce,
      to: tx.to,
      value: tx.value,
      data: tx.data,
      gas: tx.gas,
      maxFeePerGas: tx.fees.maxFeePerGas,
      maxPriorityFeePerGas: tx.fees.maxPriorityFeePerGas,
    });
    const signed = await signEvmTransaction(from, unsigned.slice(2));
    const serializedTransaction = (signed.startsWith("0x") ? signed : `0x${signed}`) as `0x${string}`;
    return pub.sendRawTransaction({ serializedTransaction });
  }

  /**
   * Gas cost of one send, in ETH.
   *
   * Returns 0 for ERC-20s: their gas is paid in ETH but the fee is charged in
   * the token, and converting needs a price this layer doesn't have. The caller
   * falls back to its floor for those until token withdrawals are enabled.
   */
  async estimateNetworkFee(symbol: string): Promise<number> {
    if (symbol !== this.config.nativeSymbol) return 0;
    try {
      const fees = await this.pub().estimateFeesPerGas();
      const wei = BigInt(21000) * fees.maxFeePerGas;
      return Number(wei) / 1e18;
    } catch {
      return 0;
    }
  }

  async getBalance(address: string, symbol: string): Promise<number> {
    try {
      if (symbol === this.config.nativeSymbol) {
        const wei = await this.pub().getBalance({ address: address as `0x${string}` });
        return Number(wei) / 1e18;
      }
      const token = this.config.tokens.find((t) => t.symbol === symbol);
      if (!token) return 0;
      const raw = (await this.pub().readContract({
        address: token.address as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      })) as bigint;
      return Number(raw) / 10 ** token.decimals;
    } catch {
      return 0;
    }
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
