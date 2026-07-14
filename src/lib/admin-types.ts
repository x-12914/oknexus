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
  status: string; // NONE | PENDING | APPROVED | REJECTED
  legalName: string | null;
  country: string | null;
  idNumber: string | null;
}

export type AdminActionBody =
  | { type: "suspend"; userId: string; value: boolean }
  | { type: "role"; userId: string; value: string }
  | { type: "kyc"; userId: string; value: string }
  | { type: "dispute"; orderId: string; value: "release" | "refund" }
  | { type: "deactivateAd"; adId: string };
