/** Client-safe ramp payout types. No `server-only` import — the UI imports these. */

export interface PayoutBank {
  code: string;
  name: string;
}

export interface PayoutFieldSpec {
  /** Regex the account identifier must match, e.g. "^\d{10}$" for NG. */
  accountPattern: string;
  accountLabel: string;
  accountPlaceholder: string;
}

export interface PayoutConfig {
  country: string; // "NG"
  fiatCode: string; // "NGN"
  minFiat: number; // 500
  maxFiat: number; // 500_000_000
  /** Assets we can debit to fund the payout. */
  fromSymbols: string[];
  banks: PayoutBank[];
  fields: PayoutFieldSpec;
}

export interface PayoutQuote {
  quoteId: string; // Bitnob "QT2_…"
  payoutId: string; // Bitnob uuid
  fromSymbol: string; // "USDT"
  fromAmount: number; // debited from the user
  fiatCode: string; // "NGN"
  fiatAmount: number; // lands in the bank account
  /** Mid-market reference rate. */
  marketRate: number;
  /** What the user actually gets, after the provider's baked-in margin. */
  effectiveRate: number;
  /**
   * The provider reports `fees: 0` and hides its margin inside effectiveRate,
   * so we derive the real cost instead of trusting that field.
   */
  spreadPct: number;
  feeFiat: number;
  /** OKNexus margin, in fromSymbol, on top of the provider's spread. */
  platformFee: number;
  /** What the user is actually debited: provider cost + platformFee. */
  totalFrom: number;
  expiresAt: number; // ms epoch
}

export interface FiatPayoutView {
  id: string;
  status: string;
  fromSymbol: string;
  fromAmount: number;
  fiatCode: string;
  fiatAmount: number;
  effectiveRate: number;
  feeFiat: number;
  bankName: string;
  /** Masked — the full number is never sent back to the client. */
  accountNumber: string;
  accountName: string | null;
  error: string | null;
  createdAt: number;
}

/** Result of resolving a bank account to its registered holder. */
export interface ResolvedAccount {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  verified: boolean;
}
