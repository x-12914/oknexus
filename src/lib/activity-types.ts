// Client-safe activity types (no server imports).

export type ActivityKind =
  | "order"
  | "trade"
  | "deposit"
  | "withdrawal"
  | "swap"
  | "otc"
  | "p2p"
  | "fiat"
  | "transfer";

/** One normalised row covering every kind of transaction on the platform. */
export interface ActivityRecord {
  id: string;
  kind: ActivityKind;
  status: string;
  createdAt: number;
  asset: string;
  amount: number;
  counterAsset?: string;
  counterAmount?: number;
  fee?: number;
  feeAsset?: string;
  /** Tx hash, order id or provider reference, where one exists. */
  reference?: string;
  /** Human-readable summary of what happened. */
  detail: string;
}
