/**
 * The legacy simulated fiat ramp.
 *
 * It settles to REAL internal balances while the fiat leg is imaginary: a
 * "card" purchase credits crypto without any payment being taken, or any card
 * details even being collected. On its own that was a harmless demo.
 *
 * Alongside a live withdrawal rail it is a money printer — register, buy, swap
 * to USDT, withdraw real naira — so it is off unless explicitly enabled and
 * must stay off anywhere payouts are live. Re-enable only for local demos.
 */
export function simulatedRampEnabled(): boolean {
  return process.env.ENABLE_SIMULATED_RAMP === "true";
}

/**
 * Staking rewards.
 *
 * `unstake` credits accrued yield with no counter-movement — the reward is
 * minted, not funded. Realised amounts have been tiny, but with a live
 * withdrawal rail it is still value created from nothing, so new stakes are
 * off until the yield is paid from a real treasury.
 *
 * Note this gates ENTERING only. Unstaking always works: a user must be able to
 * get their principal back regardless of how the flag is set.
 */
export function earnEnabled(): boolean {
  return process.env.ENABLE_EARN === "true";
}

/**
 * Whether a verified identity is required before fiat can leave the platform.
 *
 * Defaults to ON: unset means required. A money control should fail toward the
 * restrictive setting, so a cleared or mistyped variable stops payouts rather
 * than silently opening them.
 */
export function payoutRequiresKyc(): boolean {
  return process.env.PAYOUT_REQUIRE_KYC !== "false";
}
