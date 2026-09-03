# OKNexus custody policy (draft)

Status: draft for client sign-off. Every number marked **[decide]** is a business
choice that must be made once, on purpose. Everything else describes what the
system enforces today, with the setting that controls it.

## 1. Scope

Applies to all customer crypto held by OKNexus: deposits, hot-wallet balances,
in-flight withdrawals and sweeps. Fiat is never held by OKNexus; it moves
through licensed payout and collection providers (see the counterparty policy).

## 2. Model

- **Custodial, single hot wallet per chain, per-user deposit addresses.**
  Addresses are derived from one organisation key held in Turnkey. Nobody at
  OKNexus holds a private key.
- **Ledger of record is Postgres**, append-only. On-chain balances are
  reconciled against ledger liabilities every minute and any shortfall raises
  a critical alert (`ledger:shortfall`).
- **Deposits** are credited after `EVM_MIN_CONFIRMATIONS` blocks (currently 12
  on Ethereum), then swept to the hot wallet. ERC-20 sweeps are gas-funded
  from the hot wallet; a sweep is skipped below `EVM_MIN_TOKEN_SWEEP`
  (currently 10 units) so gas is never spent moving dust.
- **Withdrawals** are signed by Turnkey from the hot wallet, subject to the
  controls in section 4.

## 3. Chains and assets offered

| Chain | Status | Assets |
|---|---|---|
| Ethereum mainnet | live | ETH, USDT, USDC |
| Solana | adapter ready, not offered | SOL (enable with `CUSTODY_CHAINS=evm,sol` once a mainnet RPC and a funded Turnkey hot wallet exist) |
| Bitcoin | adapter ready, deposits only under Turnkey | BTC (`BTC_NETWORK=mainnet`; Turnkey PSBT signing for withdrawals is not built) |

Assets tradeable on the internal ledger but not depositable or withdrawable:
BNB, XRP, ADA. A customer can only hold these by trading and can only exit by
trading back. **[decide]** whether to keep listing assets that cannot leave.

## 4. Withdrawal controls

| Control | Today | Setting |
|---|---|---|
| Two-factor authentication required | yes | always |
| Daily cap, unverified | $200 rolling 24h | `LIMIT_UNVERIFIED_USD` |
| Daily cap, Basic (NIN register) | $500 | `LIMIT_BASIC_USD` |
| Daily cap, Verified | $2,000 | `WITHDRAW_DAILY_USD_LIMIT` |
| Address whitelist | opt-in per user, with a 24h cooling period on new addresses | user setting |
| Dual control | withdrawals above a threshold wait for a second approver who is not the requester | `WITHDRAW_APPROVAL_USD` **[decide]** |
| Hot wallet floor | alert when hot ETH is below 0.01 | `EVM_HOT_MIN_ETH` **[decide]** |

**[decide]** the hot-wallet ceiling: the balance above which funds move to a
cold address, and who holds that address. Nothing enforces a ceiling today.

## 5. Keys and access

- Signing keys live in Turnkey. Policies there restrict which API key may sign
  for which addresses. **[decide]** the Turnkey quorum for policy changes.
- Server access is by SSH key. Production secrets live only in the server's
  environment file, never in the repository or chat.
- Admin roles in the application are `ADMIN` and `SUPPORT`; only `ADMIN` can
  approve withdrawals or change a user's verification status.

## 6. Monitoring and incident response

- `/api/health` returns 503 when any critical check fires; an external monitor
  should page on it **[decide who]**.
- Alerts: market data down, chain RPC stalled, ledger shortfall, stuck
  withdrawals or payouts, low payout float, low hot-wallet gas, unbacked P2P
  ads, misconfigured token list.
- On a suspected key compromise: pause withdrawals (set
  `WITHDRAWALS_PAUSED=true` **[to build]**), rotate the Turnkey API key, move
  hot funds to cold, then investigate.

## 7. Backups

Postgres is dumped nightly to the same disk as the database. **[decide]** an
offsite destination. Restores are verified with `scripts/verify-backup-restore.sh`.

## 8. Review

This policy is reviewed when a chain or asset is added, a limit changes, or
after any incident, and at least every six months.
