# ADR 0005: Multi-Currency v1 (COP base, USD accounts)

- Status: Accepted
- Date: 2026-07-25

## Context

Money Control v1 stored every account and transaction in Colombian pesos, with the
`currency` column pinned to `'COP'` by CHECK constraints on `accounts`,
`transactions`, `recurring_transactions`, and `recurring_occurrences`. Users need
to hold and record activity in US dollars (a USD savings account, USD freelance
income, a USD credit card) while keeping COP as the single base currency for all
consolidated reporting.

Money is stored as safe-range integer minor units. COP has `minorUnitFactor = 1`
(one unit = one whole peso), so every existing integer already **is** a minor-unit
value; nothing needs reinterpreting. USD has `minorUnitFactor = 100` (cents).

## Decision

### Base and supported currencies

- Base currency is fixed to **COP**. There is no setting to change it.
- Supported account currencies are **COP** and **USD**. No EUR or user-defined
  currencies in v1.
- Every account has exactly one currency, chosen at creation (default COP,
  required) and **immutable once the account has financial history**.

### Money representation

- Persist money as integer minor units in existing `INTEGER` columns. Never use
  SQLite `REAL`/`FLOAT`/`DOUBLE`. Never use `parseFloat` as authoritative parsing.
- COP: `fractionDigits 0`, whole pesos. USD: `fractionDigits 2`, cents.
- All parsing, formatting, and conversion is centralized in `src/features/currency`
  (`CurrencyRegistry`, `MoneyParser`, `MoneyFormatter`, `CurrencyConversionService`).

### Column naming (no destructive renames)

Existing physical columns (`amount`, `opening_balance`, `credit_limit`,
`statement_balance`, `minimum_payment`) are **kept** and documented as minor-unit
columns. `*Minor` naming is used in TypeScript domain models, service DTOs, form
models, and **newly added** columns. Renaming physical columns purely for naming
consistency is rejected: it would force a destructive rewrite of every repository,
backup, export, and test with no functional benefit.

### Transaction snapshots

Each income / expense / refund stores `base_amount_minor` — the COP value at record
time — plus an immutable exchange-rate snapshot (`exchange_rate_scaled`,
`exchange_rate_scale`, `exchange_rate_date`, `exchange_rate_source`). Reports,
Budgets, and Home read `base_amount_minor`, never the current valuation rate.
Refreshing the rate affects current valuation only and never rewrites history.

### Transfer model

The existing `account_id` / `amount` / `currency` are the **source leg**. New
`destination_amount_minor` / `destination_currency_code` are the **destination
leg**.

- Same-currency transfer: destination amount equals source amount in the same
  currency; no exchange-rate fields required.
- Cross-currency transfer: source and destination amounts are both required and
  authoritative, currencies must differ, and the effective rate snapshot is saved.
  A saved transfer is never recalculated with the current Frankfurter rate.

Transfers remain excluded from income, expenses, and Budgets, and are net-worth
neutral within a single currency.

### Exchange rates

- Reference rate from Frankfurter (`GET https://api.frankfurter.dev/v2/rate/USD/COP`,
  no API key). Validated and converted immediately to a scaled integer
  (`rate = rate_scaled / rate_scale`, `rate_scale = 10000`). Never persisted as a
  float.
- The latest valid USD/COP valuation rate is cached in a new `exchange_rates` table.
  Freshness is 24 hours. A stale rate triggers one non-blocking refresh; a failed
  refresh keeps the last valid rate (never deleted) and marks it stale. Manual rate
  entry is always available.
- Conversion: `copMinor = round(usdMinor * rate_scaled / (100 * rate_scale))` using
  BigInt intermediates, one shared **round-half-away-from-zero** policy, asserting a
  safe-integer result.

### Net worth

- Current estimated net worth = exact COP balances + USD balances converted at the
  latest saved valuation rate. Rate changes move estimated net worth but never
  create income/expense or alter snapshots.
- **No valid rate:** USD accounts are excluded from the consolidated COP total,
  which is marked *"Estimated — incomplete"* with the explanation *"USD accounts are
  not included because no USD/COP exchange rate is available."* Native USD balances
  are still shown.
- **Historical net-worth timeline (Option A):** historical USD balances are
  converted at the current saved valuation rate and the series is labeled
  *"Estimated using the current saved USD/COP reference rate."* No historical FX
  valuation engine is built; the result is never presented as historically exact.

## Migration

New immutable, hand-authored migration `0009_multi_currency` uses the create-copy-
swap pattern (as in `0008`) to relax the four `*_currency_cop` CHECKs to
`IN ('COP','USD')`, add the new transaction columns, and create `exchange_rates`.
Existing rows are preserved exactly: all IDs, types, statuses, dates, balances,
limits, and relationships are unchanged; `base_amount_minor = amount`; existing
transfers migrate as same-currency COP transfers (`destination_amount_minor =
amount`, `destination_currency_code = 'COP'`); no fake rates are invented. Existing
reports and budgets remain numerically identical. `budgets` and
`credit_card_statements` need no schema change (budgets stay COP; statement currency
is implied by the card account).

## Consequences

- USD Income, Expense, Refund, same-currency and cross-currency Transfers, and USD
  credit cards are supported. Receiving USD into a USD account is Income; moving USD
  to a COP account is a separate cross-currency Transfer.
- Cross-currency card-payment statement attribution uses the destination (card-
  currency) amount.
- Backup advances to format v4 (native currency, base amount, rate snapshots,
  transfer legs, portable valuation rate); legacy v1–v3 backups migrate to COP.
- CSV export gains native + COP columns; report export stays COP.
- No new runtime dependency (native `fetch` + `AbortController`).
- Out of scope for v1: additional currencies, user-configurable base currency,
  FX gain/loss, multi-currency budgets, recurring cross-currency transfers,
  historical daily FX valuation, bank/cloud sync.
