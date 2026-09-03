/** Client-safe on-ramp types. No `server-only` import: the UI reads these. */

/** Where a purchase stands. Providers' own vocabularies are mapped onto this. */
export type OnrampStatus =
  | "CREATED" // we issued a hosted-checkout link
  | "PENDING" // the user is paying, or the provider is settling
  | "PAID" // fiat taken, crypto not yet sent
  | "COMPLETED" // crypto sent on-chain; the deposit scanner credits it
  | "FAILED"
  | "EXPIRED";

/** One asset a provider can deliver, on the network our custody scans. */
export interface OnrampAsset {
  symbol: string; // "USDT"
  /** Our custody chain id, e.g. "ethereum". */
  chain: string;
  /** The provider's own code for that network, e.g. "ETH" or "ethereum". */
  providerNetwork: string;
}

/** What the UI needs to offer a provider. */
export interface OnrampProviderInfo {
  id: string; // "alchemypay" | "onramper"
  name: string;
  assets: OnrampAsset[];
  fiats: string[]; // ISO codes the provider quotes in
  /** Shown under the button, e.g. "Card, bank transfer, mobile money". */
  methods: string;
}

export interface OnrampOrderView {
  id: string;
  provider: string;
  status: OnrampStatus;
  fiatCode: string;
  fiatAmount: number | null;
  cryptoSymbol: string;
  cryptoAmount: number | null;
  txHash: string | null;
  createdAt: number;
}
