# Money Control — Investments v1 (Balance Tracking)

See [ADR 0006](decisions/0006-investments-v1.md) for the accepted decisions.

## Scope

Investments v1 tracks money **by account / product / vehicle** — one investment
account per platform or product (Trii, Interactive Brokers, a specific CDT, a
voluntary pension fund, a collective investment fund). It answers *"where / in
what product is my money?"*, tracked by **total balance** (`trackingMode =
balance`).

It does **not** model individual holdings, securities, symbols, quantities,
prices, buys/sells, dividends per holding, cost basis, or market-data feeds.
Those are deferred to Investments v2 (see [Extension path](#v2-extension-path)).

## Product model

An investment account is a **normal `Account`** with `type = 'investment'`, plus:

- one 1:1 row in **`investment_accounts`** (metadata), and
- 0..N rows in **`investment_valuations`** (manual market-value history).

It keeps every account behavior: a currency, a value, net-worth inclusion,
incoming/outgoing transfers, archiving, backup, and data export.

Metadata fields:

- `investmentType`: `brokerage | fixed_term_deposit | voluntary_pension | investment_fund | private_investment | other`.
- `trackingMode`: `balance` (only value in v1; the enum reserves `holdings` for v2).
- `liquidity`: `liquid | restricted | locked`.
- `providerName`, `startDate`, `maturityDate`, `note` (all optional).

The create form applies **guided, non-blocking** liquidity defaults (fixed-term
deposit → locked, voluntary pension → restricted, otherwise liquid); every field
stays editable so real cases are never rejected.

## Financial model

Moving money bank ↔ investment is a **normal Transfer**, never income/expense. A
contribution reduces the bank balance and increases invested value; it is
net-worth neutral, does not affect Budgets, Income, or Reports cash-flow. The
existing `TransactionService` is reused unchanged — investment accounts are just
valid transfer source/destination (and valid Income destination for reinvested
returns).

Definitions (posted transfers only):

- **External contribution** — transfer from a non-investment account → investment.
- **External withdrawal** — transfer from investment → non-investment account.
- **Internal investment transfer** — transfer between two investment accounts;
  moves value inside the portfolio without changing global net contributions.

Per account, **net contributions = the derived ledger balance** (opening balance
+ posted transfers/income in − out, in native currency). Because an internal
A→B transfer debits A and credits B by the same amount, the sum of per-account
net contributions across the portfolio equals net **external** contributions —
internal transfers cancel in the sum with no special-casing.

## Current-value model (the core decision)

The transaction-derived balance (net contributions) can differ from market value.
Each `investment_valuation` stores two integers in the account's **native**
currency:

- `valueMinor` — the total market value read from the user's statement.
- `basisMinor` — a **snapshot of net contributions at record time** (derived
  from the ledger then), mirroring the `base_amount_minor` snapshot pattern used
  by multi-currency transactions.

Derived:

```
latestValuation     = the valuation with the greatest (valuationDate, createdAt)
unrealizedGain      = latest ? latest.valueMinor - latest.basisMinor : 0
currentValue        = netContributions(now) + unrealizedGain      (= netContributions if no valuation)
estimatedGainLoss   = currentValue - netContributions = unrealizedGain
```

Why this satisfies every requirement:

- **Contributions stay net-worth neutral even after a valuation exists**: a later
  contribution raises net contributions and therefore `currentValue` one-for-one,
  while the locked unrealized gain is preserved.
- **Recording a valuation changes net worth** (via `currentValue`) and creates
  **no transaction** — never an Income, Expense, transfer, or fake row.
- **No valuation → `currentValue = netContributions`**, so estimated gain is 0;
  market value is never invented.
- Portfolio reconciles: `Σ estimatedGainLoss = totalValue − netExternalContributions`.

**Initial-value policy:** `currentValue` = latest valuation, else the derived
balance (net contributions), which includes the account's `opening_balance`
(pre-existing invested capital counts in net worth from day one, like any
account). A valuation is not required at creation; the form optionally records a
first valuation.

## Net worth

`AccountService.estimateNetWorth` is fed accounts through
`withInvestmentCurrentValues`, which replaces each investment account's derived
balance with its `currentValue` (native) before aggregation. Every other account
keeps its ledger balance — **exactly one source per account, so no double
counting**. USD investments convert at the saved valuation rate; when USD exists
but no rate is available the consolidated total is `null` / *"Estimated —
incomplete"* (never a silent COP 0).

Invariants: contributions and withdrawals do not change net worth; valuations do;
realized investment income changes net worth through its normal Income
transaction.

## Investment income

Three distinct things:

1. **Unrealized gain/loss** — from valuations only; never Income; shown as
   "Estimated investment gain/loss".
2. **Realized income received in cash** (e.g. CDT interest paid to your bank,
   dividends) — a **normal Income** transaction into the receiving account, using
   the seeded **"Investment Income"** income category.
3. **Capital withdrawal** — a transfer investment → bank; not Income.

Reinvested income (return that stays invested) may be recorded as an **Income**
transaction into the investment account (it raises net contributions and is
treated as realized basis, so it is not double-counted as unrealized gain), or
simply captured by the next valuation. No fifth transaction type or income
subtype is introduced. The app never computes interest, dividends, withholding,
annual return, IRR/TWR, realized gains from sales, cost basis, or taxes.

## Estimated gain/loss and return

```
estimatedGainLoss     = currentValue − netContributions
simpleEstimatedReturn = estimatedGainLoss / netContributions   (integer basis points, BigInt)
```

The return is **unavailable** when net contributions are not strictly positive
(zero, full withdrawal, or withdrawals ≥ contributions) — never NaN/Infinity. It
is labeled **"Simple estimated return"** (never Annual return, APY, IRR, TWR).

## Multi-currency

Each investment has one native currency (COP or USD), immutable after activity.
Valuations must use the account's currency (a USD account cannot be valued in
COP). Consolidated COP uses the saved USD/COP valuation rate; refreshing
Frankfurter changes estimated consolidated value and net worth but never creates
Income/Expense and never rewrites transfers, income, reports, budgets, or
valuation history. Cross-currency contributions are ordinary cross-currency
transfers (both amounts + effective-rate snapshot).

## UI

- **Accounts** groups a dedicated **Investments** section (investment accounts are
  excluded from the cash/credit lists so their ledger balance is never shown as
  spendable) and links to the Investments screen.
- **Home** shows an **Investments** card (only when investment accounts exist) and
  wires net worth through `withInvestmentCurrentValues`.
- **More → Investments** opens `/investments`.
- **Investments screen** (`/investments`): portfolio summary (total current value,
  net contributions, estimated gain/loss + simple return, count, allocation by
  type and currency, locked/restricted subtotal) + a card per account.
- **Details** (`/investments/[id]`): current value + estimated COP, contributions/
  withdrawals, gain/loss + %, valuation history, and actions — Update value, Add
  contribution (transfer in), Withdraw (transfer out), Edit, Archive.
- **Update value** (`/investment-valuation-form`): value/date/note with a live
  preview (previous, new, change %, net contributions, estimated gain/loss). One
  valuation per account per date (recording an existing date replaces it);
  backdated dates allowed, future dates rejected; archived investments cannot be
  revalued.

Liquidity is a **label** and a "Locked/restricted value" subtotal only. Locked
investments are never presented as spendable cash; Home shows Cash & banking /
Investments / Credit-card debt / Net worth without claiming any investment is
available to spend.

## Reports

Reports keeps Income, Gross expenses, Refunds, Net expenses, and Net result
unchanged — valuations never enter cash-flow, categories, or Budgets. An opt-in
**Investments** section (shown only when investment accounts exist) presents the
current position plus **realized investment income for the period** (posted
income into an investment account or tagged the Investment Income category). The
net-worth timeline overlays each investment's valuation adjustment (value − basis
of the latest valuation on or before each point), so its final point matches
Home's estimated net worth; the base net-worth SQL is unchanged.

## Database

New tables (schema `0012`, [migration strategy](#migration)):

- `investment_accounts` — `account_id` PK + FK → `accounts(id)`; `investment_type`,
  `tracking_mode`, `liquidity`, `provider_name`, `start_date`, `maturity_date`,
  `note`, audit timestamps. CHECKs enforce the enums, valid dates, and
  `maturity_date >= start_date`.
- `investment_valuations` — `id`, `investment_account_id` FK → `accounts(id)`,
  `value_minor` (≥ 0), `basis_minor` (safe integer, may be negative), `currency_code`
  (COP/USD), `valuation_date`, `note`, audit. Unique index
  `(investment_account_id, valuation_date)`.

The `accounts` type CHECK gains `'investment'`. Investment metadata lives in a
separate table so `accounts` stays clean and never conflicts with the
credit-card-only column CHECKs.

## Migration

`0012_investments_v1` relaxes the `accounts_type_valid` CHECK with the
create-copy-swap pattern (as in `0009`): it rebuilds `accounts` and every table
that holds a foreign key to it (`transactions`, `transaction_splits`,
`credit_card_statements`, `recurring_transactions`, `recurring_occurrences` —
recreated byte-for-byte, refund triggers and indexes included), then creates the
two investment tables. Existing rows are preserved exactly; a database with no
investment accounts simply gains the two empty tables. `drizzle-kit generate` is
not used; the migration is hand-authored.

## Backup and Data Export

Backup advances to **format v5** (see [backup-and-restore.md](backup-and-restore.md)):
`investmentAccounts` and `investmentValuations` collections, `investment` account
type, investment counts in the summary, and relationship validation (1:1
metadata↔account, valuation currency matches its account, one valuation per
account/date, no orphans). Legacy v1–v4 backups migrate in memory with empty
investment collections.

Data Export adds two CSV files (see [data-export.md](data-export.md)):
`money-control-investments-*.csv` and `money-control-investment-valuations-*.csv`.
CSV stays plaintext and non-restorable, with formula-injection protection.

## Architecture

Feature slice `src/features/investments/`: `investment.types.ts`,
`investment.repository.ts` + `sqlite-investment.repository.ts`,
`investment.service.ts` (account + metadata, atomic create/update),
`investment-valuation.service.ts` (record/replace/delete with basis snapshot),
`investment-portfolio.service.ts` (pure helpers + `getPortfolio` /
`withInvestmentCurrentValues`), `use-investments.ts`, `investment-format.ts`, and
`components/`. It reuses account balances, currency conversion, money formatting,
transfer logic, backup serialization, and CSV escaping — none are duplicated.

## Known limitations

- No holdings/securities/prices per asset (v2). Total-balance tracking only.
- No automatic interest, dividends, withholding, IRR/TWR/APY, cost basis, taxes,
  or realized gains from sales.
- `basis_minor` is snapshotted at record time; backdating a contribution after a
  valuation shifts the estimated gain — re-record the valuation to correct it.
- The historical net-worth timeline overlays the valuation in effect at each point
  (estimated); it does not reconstruct historical daily FX or interpolate between
  valuations.
- Consolidated USD uses the current saved rate (Option A); marked incomplete when
  no rate exists.
- No CDT maturity or stale-valuation reminders in v1.
- Withdrawing realized gains requires recording the gain as Income first, because
  a transfer withdrawal is limited to net contributions (funds check).

## v2 extension path

`tracking_mode = 'holdings'` (enum already reserved) would enable:

```
InvestmentAccount └── Holding (symbol, quantity, avg cost) └── InvestmentOperation (buy/sell/dividend/fee)
```

Then `currentValue` would derive from Σ(holding.qty × price) instead of manual
valuations (manual valuations remain valid for `trackingMode = balance`), and the
rate model would generalize beyond the single USD-COP pair. Realized gains, cost
basis, per-holding dividends, market-data APIs, allocation by security,
benchmarks, and reminders are all deferred and not blocked by the v1 design.
