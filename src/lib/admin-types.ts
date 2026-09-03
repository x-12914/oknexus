// Client-safe admin + KYC types (no server imports).

export interface AdminOverview {
  users: number;
  suspended: number;
  pendingKyc: number;
  spotOrders: number;
  openOrders: number;
  p2pOrders: number;
  activeAds: number;
  disputes: number;
  swaps: number;
  ramps: number;
  otc: number;
  deposits: number;
  withdrawals: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  kycStatus: string;
  /** NIN-register tier; never unlocks fiat. */
  kycBasicStatus: string;
  /** Route of the most recent verification session: basic | bvn | full. */
  kycRoute: string | null;
  /** Server-side sanctions screening on that session, when it ran. */
  amlStatus: string | null;
  amlScore: number | null;
  suspended: boolean;
  createdAt: number;
  kycLegalName: string | null;
  kycCountry: string | null;
  kycIdNumber: string | null;
}

export interface AdminDispute {
  id: string;
  asset: string;
  assetAmount: number;
  fiat: string;
  fiatAmount: number;
  buyerName: string;
  sellerName: string;
  twoParty: boolean;
  createdAt: number;
}

export interface AdminLedgerRow {
  id: string;
  userEmail: string;
  symbol: string;
  delta: number;
  type: string;
  memo: string | null;
  createdAt: number;
}

export interface AdminAd {
  id: string;
  advertiserId: string | null;
  merchantName: string;
  side: string;
  asset: string;
  fiat: string;
  price: number;
  available: number;
  active: boolean;
  createdAt: number;
}

export interface KycInfo {
  status: string; // full (document) verification: NONE | PENDING | APPROVED | REJECTED | REVIEW
  basicStatus?: string; // NIN-register verification, same states; never unlocks fiat
  basicAvailable?: boolean; // true when the no-document route can be offered
  bvnAvailable?: boolean; // true when BVN + selfie (no document, full strength) can be offered
  legalName: string | null;
  country: string | null;
  idNumber: string | null;
  automated?: boolean; // true when a hosted provider (Didit) drives verification
}

export type AdminActionBody =
  | { type: "suspend"; userId: string; value: boolean }
  | { type: "role"; userId: string; value: string }
  | { type: "kyc"; userId: string; value: string }
  | { type: "dispute"; orderId: string; value: "release" | "refund" }
  | { type: "deactivateAd"; adId: string };

export interface AdminAlert {
  key: string;
  severity: string;
  title: string;
  detail: string;
  firing: boolean;
  firstSeen: number;
  lastSeen: number;
  resolvedAt: number | null;
}

export interface AdminHealth {
  alerts: AdminAlert[];
  health: {
    ok: boolean;
    lastCronAt: number | null;
    cronStale: boolean;
    critical: { key: string; title: string; detail: string; since: number }[];
    warnings: { key: string; title: string; detail: string; since: number }[];
  };
}

export interface AdminReserves {
  checked: number;
  shortfalls: { chain: string; symbol: string; heldOnChain: number; owedToUsers: number }[];
  heldOnChain: number;
  owedToUsers: number;
}
