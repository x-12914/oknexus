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
