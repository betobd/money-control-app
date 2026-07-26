# ADR 0006: Investments v1 (balance tracking)

- Status: Accepted
- Date: 2026-07-26

## Context

Users hold money in investment vehicles — brokerage platforms (Trii, Interactive
Brokers), fixed-term deposits (CDTs), voluntary pension funds, and collective
investment funds — and want to track it as part of their finances without the app
becoming a portfolio manager. v1 tracks value **per account/product by total
balance**, not per security. Moving money into an investment must be a transfer
(net-worth neutral), a valuation update must change net worth without becoming
Income, and none of it may corrupt the existing derived-balance ledger.

## Decision

### Model

- An investment account is a normal `accounts` row with `type = 'investment'`
  plus a 1:1 `investment_accounts` metadata row (`investmentType`, `trackingMode`,
  `liquidity`, provider, dates, note) and 0..N `investment_valuations` rows.
- `trackingMode` is `balance` only in v1; the enum reserves `holdings` for v2.
- `opening_balance` is allowed and represents pre-existing invested capital
  (counts in net worth from creation, like any account).

### Financial model

- Contributions/withdrawals are ordinary transfers reusing `TransactionService`.
  Per-account **net contributions = the derived ledger balance**. Internal
  investment-to-investment transfers cancel in the portfolio sum, so they never
  change net external contributions.
- Realized income received in cash is a normal Income transaction with a seeded
  **"Investment Income"** category; reinvested income may be Income into the
  investment account. No new transaction type or income subtype.

### Current-value model (chosen over options 1–4 in the brief)

- Each valuation stores `value_minor` (market value) and `basis_minor` (a snapshot
  of net contributions at record time), both in the account's native currency.
- `currentValue = netContributions(now) + (latest.value − latest.basis)`; with no
  valuation it equals net contributions. This keeps post-valuation contributions
  net-worth neutral, makes a valuation move net worth **without any transaction**,
  and never invents market value. Estimated gain/loss = `currentValue −
  netContributions`; simple estimated return is integer basis points, unavailable
  when net contributions ≤ 0.

### Net worth

- Net worth substitutes each investment account's derived balance with its
  `currentValue` via a pure `withInvestmentCurrentValues` helper before
  `estimateNetWorth` — one source per account, no double counting. USD converts at
  the saved valuation rate; incomplete (null) when no rate exists.

### Multi-currency, Reports, Home, Accounts

- Valuations use the account's currency. Rate refreshes move estimated
  consolidation only; they never create Income/Expense or rewrite history.
- Reports keeps cash-flow/categories/budgets unchanged and adds an opt-in
  Investments section (current position + realized investment income); the
  net-worth timeline overlays the valuation in effect per point (base SQL
  unchanged).
- Accounts shows a dedicated Investments section (investment accounts excluded
  from cash/credit lists); Home shows an Investments card and the Cash & banking /
  Investments / Credit-card debt / Net worth breakdown. Locked/restricted value is
  a label/subtotal, never "spendable".

### Reminders

- CDT-maturity and stale-valuation reminders are deferred to v2 to keep scope
  small. `maturityDate` is shown in the UI without a scheduled notification.

## Migration

New hand-authored, immutable migration `0012_investments_v1` uses the
create-copy-swap pattern (as in `0009`) to add `'investment'` to the
`accounts_type_valid` CHECK, rebuilding `accounts` and its five FK-dependent
tables unchanged (refund triggers and indexes included), then creates
`investment_accounts` and `investment_valuations`. Existing data is preserved
exactly; legacy databases gain two empty tables.

## Consequences

- Backup advances to format **v5** (investment collections, `investment` account
  type, investment summary counts, relationship validation); legacy v1–v4 backups
  migrate in memory with empty investment collections.
- Data Export gains two CSV files (investments summary, valuation history), COP
  estimates included, plaintext and non-restorable, formula-injection protected.
- Reports gains an Investments section and a valuation-adjusted net-worth timeline.
- Out of scope for v1: individual holdings/securities/prices, buys/sells,
  dividends/fees per holding, cost basis, realized gains from sales, IRR/TWR/APY,
  taxes, market-data APIs, maturity/valuation reminders, and historical daily FX
  for the timeline.
