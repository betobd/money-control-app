# Money Control — Currency & Rates

See [ADR 0008](decisions/0008-configurable-base-currency.md) for the current
decisions, and [ADR 0005](decisions/0005-multi-currency-cop-usd.md) for the money
representation and transfer model it builds on.

## Base and supported currencies

- The **base currency is a per-install setting** (`app_settings.base_currency_code`,
  migration 0014). All consolidated values — estimated net worth, Home period
  summaries, Reports, Budgets, and report CSV exports — are in it.
- A fresh install **chooses it in the first-run welcome flow** (`/onboarding`),
  preselected from the device locale's currency (`expo-localization`) and falling
  back to USD. The flow runs before the tabs, so no transaction or budget can lock
  the seeded default first. Restoring a backup from the welcome flow adopts the
  backup's base instead.
- It can be changed **freely until the install has a transaction or a budget**, and
  is fixed after that. **More → Currency & Rates** always shows why: *"Every one of
  your N transactions stores its value in the current base currency. Changing it
  would require restating them at historical exchange rates, which are not kept."*
- **160 currencies** are supported: every spendable currency Frankfurter quotes.
  Metals (XAU/XAG/XPT/XPD) and XDR are excluded — priced per troy ounce or a unit
  of account, neither has minor units.
- Every account has exactly one currency, selected at creation (defaults to the
  base currency) and **immutable once the account has financial history** (a
  nonzero opening balance or any transaction, transfer, refund, occurrence, or
  statement reference): *"The currency cannot be changed after this account has
  financial activity."*

## Money representation

- Money is stored as integer minor units, with `minorUnitFactor` and
  `fractionDigits` per currency in `src/features/currency/currency-registry.ts`.
- That file is **generated** by `scripts/generate-currency-registry.mjs` from
  Frankfurter's currency list plus ICU minor-unit data. Edit the generator, not the
  table.
- `fractionDigits` is **frozen once shipped**: it defines what a stored integer
  means, so changing 0 → 2 divides every existing amount by 100.
  `tests/currency.test.mjs` pins the values in use.
- **COP is `fractionDigits: 0`** — whole pesos — deliberately, even though ISO 4217
  and ICU say 2. Existing rows are whole pesos.
- Parsing (`money-parser.ts`) enforces each currency's precision; commas are
  thousands separators, dots are decimals.
- Formatting is currency-aware (`money-formatter.ts`): the currency code
  disambiguates the `$` symbol; screen readers receive the currency name.
- No monetary value or exchange rate is ever stored as SQLite `REAL`.

## Exchange rates

- Reference rates come from **Frankfurter** (`GET /v2/rate/{base}/{quote}`, no API
  key). The request contains only currency codes — never any account or financial
  data.
- **One rate per foreign currency, always against the base**, stored as
  `${foreign}-${base}` (e.g. `USD-COP`) and read as *1 base = rate quote*.
- Rates are scaled integers: `rate = rateScaled / rateScale`. **`rateScale` is
  chosen per rate**, starting at four decimals and rising only until the value
  carries five significant digits — no fixed scale serves both
  `1 USD = 4,102.3456 COP` and `1 COP = 0.00024 USD`.
- A rate always travels with its pair (`DirectedRate`). A bare number is not a
  rate: 4102.3456 is meaningless without knowing which way round it goes.
  `convertMinor` applies a rate in either direction and **rejects** one for an
  unrelated pair rather than producing a plausible wrong number.
- Conversion (`currency-conversion.service.ts`) uses BigInt intermediates and one
  deterministic **round-half-away-from-zero** policy, asserting a safe-integer
  result. All conversion/rounding lives there — no screen or repository duplicates
  it, and nothing in it knows which currency is the base.

### Caching, freshness, offline

- Saved rates live in `exchange_rates`, fresh for 24 hours. On startup / first
  access to currency-dependent data, each stale or missing currency triggers **one**
  non-blocking refresh, de-duplicated and rate-limited per currency after failure.
  One unreachable currency never discards the rates that did arrive.
- A failed refresh keeps the last valid rate (never deleted) and marks it stale.
  Manual entry is always available.
- Frankfurter is a *reference* rate, labeled as such — "Your bank may use a
  different rate." It is never presented as a live/guaranteed bank or TRM rate.

### Settings

**More → Currency & Rates** (`/currency-rates`, inside App Lock) shows the base
currency with its change/lock state, then one card per foreign currency actually
held — rate, source, effective date, last-fetched time, fresh/stale status, Refresh
and manual entry. Currencies the user does not hold are not listed; a rates screen
with 159 irrelevant rows would bury the one that is stale.

## Transactions, transfers, and snapshots

- Each income / expense / refund in a non-base currency stores a **base-amount
  snapshot** (`base_amount_minor`) plus an immutable rate snapshot. Reports,
  Budgets, and Home read the snapshot; refreshing the rate never rewrites history.
- The snapshot **says which currencies it is in**: `base_currency_code`, and
  `exchange_rate_base_code` / `exchange_rate_quote_code` for the rate. Before
  migration 0014 both were implied, which stopped working once a transfer can join
  two non-base currencies.
- Receiving a foreign currency into an account of that currency is **Income**.
  Moving it to an account in another currency is a separate **cross-currency
  Transfer**.
- Same-currency transfers store one native amount for both legs. Cross-currency
  transfers store both actual amounts (authoritative) and the effective rate, and
  are never recalculated with the current rate. Both remain excluded from income,
  expenses, and Budgets.
- A derived transfer rate is stated in whichever direction gives a value ≥ 1, for
  precision; the pair travels with it, so both readings are equivalent.
- Cross-currency card payments are transfers; statement attribution uses the
  destination (card-currency) amount.

## Net worth

- Current estimated net worth = exact base-currency balances + foreign balances
  converted at the latest saved rates. A currency with no rate is **excluded and
  named**: the total reads *"Estimated — incomplete"* and says which currencies are
  missing, so the warning is actionable. Native balances are still shown, and rate
  changes never create income/expense.
- **Historical net-worth timeline (Option A):** historical foreign balances are
  converted at the current saved rates and labeled an estimate. No historical FX
  valuation engine exists.

## Known limitations

- The base currency cannot be changed once transactions or budgets exist.
- Budgets are in the base currency only; no per-currency budget limits.
- No recurring cross-currency transfers.
- No FX gain/loss, cost-basis, or tax accounting.
- The historical net-worth timeline uses current rates (Option A), not historical
  daily FX; cross-currency transfer FX drift is not modeled in the timeline.
- Display grouping follows the registry, which uses the dot-decimal convention the
  money parser accepts, so what is shown matches what is typed. It does not follow
  the reader's locale.
