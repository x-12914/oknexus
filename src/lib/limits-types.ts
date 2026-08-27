// Client-safe verification tier types.

export interface VerificationTier {
  id: string;
  label: string;
  /** What a user must do to reach this tier. */
  requirement: string;
  /** Rolling-24h withdrawal cap in USD. */
  dailyWithdrawUsd: number;
  /** Whether this tier may withdraw to a bank account. */
  fiatWithdrawal: boolean;
  perks: string[];
}
