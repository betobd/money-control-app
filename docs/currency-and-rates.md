# Money Control — Currency & Rates (Multi-Currency v1)

See [ADR 0005](decisions/0005-multi-currency-cop-usd.md) for the accepted decisions.

## Base and supported currencies

- **Base currency is COP** and is fixed; there is no setting to change it. All
  consolidated values — estimated net worth, Home period summaries, Reports,
  Budgets, and report CSV exports — are COP.
- Supported account currencies are **COP** and **USD**. No EUR or user-defined
  currencies in v1.
- Every account has exactly one currency, selected at creation (default COP,
  required) and **immutable once the account has financial history** (a nonzero
  opening balance or any transaction, transfer, refund, occurrence, or statement
  reference). Attempting to change it shows: *"The currency cannot be changed after
  this account has financial activity."*

## Money representation

- Money is stored as integer minor units. COP: `minorUnitFactor 1`, `0` fraction
  digits (whole pesos). USD: `minorUnitFactor 100`, `2` fraction digits (cents).
- Existing COP integers are already minor units and are never reinterpreted.
- Parsing (`src/features/currency/money-parser.ts`) rejects fractional COP and more
  than two USD decimals; commas are thousands separators, dots are decimals.
- Formatting is currency-aware (`money-formatter.ts`): the currency code
  disambiguates the `$` symbol; screen readers receive the currency name.
- No monetary value or exchange rate is ever stored as SQLite `REAL`.

## Exchange rates

- The USD/COP reference rate comes from **Frankfurter**
  (`GET https://api.frankfurter.dev/v2/rate/USD/COP`, no API key). The request
  contains only the currency pair — never any account or financial data.
- Rates are scaled integers: `rate = rateScaled / rateScale`, `rateScale = 10000`
  (four decimals). The raw response number is validated and converted immediately;
  it is never persisted as a float.
- Conversion (`currency-conversion.service.ts`) uses BigInt intermediates and one
  deterministic **round-half-away-from-zero** policy, asserting a safe-integer
  result. All conversion/rounding lives here — no screen or repository duplicates it.

### Caching, freshness, offline

- The latest valid valuation rate is cached in the `exchange_rates` table. It is
  fresh for 24 hours. On startup / first access to currency-dependent data a stale
  or missing rate triggers **one** non-blocking refresh, de-duplicated and rate-
  limited after failure. A failed refresh keeps the last valid rate (never deleted)
  and marks it stale. Manual entry is always available.
- Frankfurter is a *reference* rate, labeled as such — "Your bank may use a
  different rate." It is never presented as a live/guaranteed bank or TRM rate.

### Manual rate & settings

- **More → Currency & Rates** (`/currency-rates`, inside App Lock) shows the base
  currency, the USD/COP reference rate, its source, effective date, last-fetched
  time, and fresh/stale status, with Refresh and manual-entry actions. Manual rates
  are parsed to a scaled integer (≤4 decimals), validated positive, and persisted
  with `source = manual`.

## Transactions, transfers, and snapshots

- Each USD income / expense / refund stores a **COP base-amount snapshot**
  (`base_amount_minor`) plus an immutable rate snapshot. Reports, Budgets, and Home
  read the snapshot; refreshing the rate never rewrites history.
- Receiving USD into a USD account is **Income**. Moving USD to a COP account is a
  separate **cross-currency Transfer**.
- Same-currency transfers store one native amount for both legs. Cross-currency
  transfers store both the actual source and destination amounts (authoritative)
  and the effective rate; they are never recalculated with the current rate. Both
  remain excluded from income, expenses, and Budgets.
- Cross-currency card payments are transfers; statement attribution uses the
  destination (card-currency) amount.

## Net worth

- Current estimated net worth = exact COP balances + USD balances converted at the
  latest saved valuation rate. When no valid rate exists, USD accounts are excluded
  and the total is marked *"Estimated — incomplete"* with the explanation *"USD
  accounts are not included because no USD/COP exchange rate is available."*; native
  USD balances are still shown. Rate changes never create income/expense.
- **Historical net-worth timeline (Option A):** historical USD balances are
  converted at the current saved valuation rate and labeled *"Estimated using the
  current saved USD/COP reference rate."* No historical FX valuation engine exists.

## Known v1 limitations

- No EUR or additional currencies; base currency is not user-configurable.
- Budgets are COP-only; no multi-currency budget limits.
- No recurring cross-currency transfers.
- No FX gain/loss, cost-basis, or tax accounting.
- The historical net-worth timeline uses the current rate for USD (Option A), not
  historical daily FX; cross-currency transfer FX drift is not modeled in the
  timeline. Editing an existing USD recurring rule shows its amount in whole units.
