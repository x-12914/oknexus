# OKNexus counterparty policy (draft)

Status: draft for client sign-off. **[decide]** marks a business choice.

## 1. Purpose

OKNexus relies on third parties for identity verification, sanctions
screening, fiat payouts, fiat collections, market data and key custody. This
policy says what each is trusted with, what is checked before money or data
moves, and what happens when one fails.

## 2. Counterparties in use

| Function | Provider | What they hold | Fallback if down |
|---|---|---|---|
| Identity verification (document, NIN, BVN) | Didit | identity documents and register lookups; we store only status and a session id | verification pauses; trading continues; fiat stays gated |
| Sanctions / PEP screening | Didit standalone AML | screened name and date of birth | approval routes to manual review, never auto-approves |
| Fiat payouts (11 countries) | Bitnob | our USDT float; beneficiary bank details | payouts pause; alert fires |
| Fiat collections (NGN) | Bitnob virtual accounts | customer naira in transit | not yet live on their side |
| Fiat on-ramp (card, bank) | Alchemy Pay, Onramper (when keys are issued) | customer card data, never touches our servers; crypto is delivered to the customer's own deposit address | the buy page shows alternatives |
| Market data | Kraken public API | nothing of ours | CoinGecko for prices; order matching pauses on a synthetic book |
| Key custody and signing | Turnkey | signing keys | withdrawals and sweeps pause |
| Email | Resend | customer email addresses | sign-up codes fail; alert fires on unverified sign-ups |

## 3. Exposure limits

- **Payout float at Bitnob:** alert below `BITNOB_FLOAT_MIN` (currently 5
  USDT). **[decide]** the maximum float kept there, and the top-up rule.
- **Hot wallet:** see the custody policy.
- **Unsettled on-ramp orders:** no balance is credited until the crypto is
  seen on-chain by our own scanner. Provider webhooks only update order
  status. There is therefore no credit exposure to an on-ramp provider.

## 4. Onboarding a new counterparty

Before a provider is wired in:

1. Confirm licensing in the markets served **[client]**.
2. Confirm data handling: what they store, for how long, where.
3. Integrate behind a flag or a missing-key check so the feature is dark until
   credentials exist, and fails closed without them.
4. Prove one real transaction end to end before showing the route as ready
   (see the `PROVEN` corridor list in `src/lib/ramp/corridor-config.ts`).

## 5. Ongoing review

- Every alert that names a provider is reviewed the same day.
- Provider fees and spreads are re-checked quarterly against the platform
  margin (`RAMP_PLATFORM_FEE_PCT`).
- **[decide]** an annual review owner.

## 6. Exit

For each provider, the exit path today:

- Didit: switch `KYC_PROVIDER`; existing statuses stay valid.
- Bitnob: corridors go dark without keys; float is withdrawn to the hot wallet.
- Alchemy Pay / Onramper: remove keys; historical orders remain readable.
- Turnkey: no exit without a key-migration plan **[decide]**.
