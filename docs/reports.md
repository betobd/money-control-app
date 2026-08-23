# Money Control — Reports

## Scope and navigation

Reports is a persisted SQLite-backed vertical slice available from **More → Reports** at `/reports`. It does not add a bottom-navigation destination; Home, Transactions, Add, Accounts, and Budgets remain the only five primary navigation items.

The implemented reports are period summary, income versus expenses over time, expenses by category, net worth evolution, and previous equivalent period comparison. Data Export v1 can serialize the existing selected-period summary as a separate two-column-style metrics CSV without moving export logic into Reports. Backup/restore, synchronization, authentication, tax reporting, forecasting, bank integrations, AI insights, and advanced analytics remain outside the Reports slice.

## Authoritative financial data

All values come from the local SQLite database. A transaction contributes only when `status = posted`, and financial membership/grouping always uses `transaction_date`, never `created_at` or `updated_at`. Dates are Bogotá-local `YYYY-MM-DD` calendar values. Amounts remain whole-peso safe integers.

Income increases cash-flow and net results; expenses reduce them. Transfers are excluded from income, expense, category, and net-result totals. Voided transactions remain historical records but have no report effect. Archived accounts and categories retain their historical meaning. Pending and skipped recurring occurrences have no financial effect; a confirmed occurrence appears only through the normal posted transaction it creates.

## Periods and grouping

The default is **Current month**. Presets use complete Bogotá-local calendar windows:

- Current month: the first through last day of the current month.
- Previous month: the complete preceding calendar month.
- Last 3 months: the current calendar month and two preceding months.
- Last 6 months: the current calendar month and five preceding months.
- Current year: January 1 through December 31 of the current year.
- Custom: an inclusive validated start/end range.

Custom dates must use `YYYY-MM-DD`; an end date earlier than the start is rejected. A range of 45 days or fewer is grouped by day. Longer ranges are grouped by calendar month. The service creates zero-value buckets for missing dates/months and preserves chronological ordering. Net-worth monthly points represent month-end values; daily points represent end-of-day values.

Calendar presets compare with the immediately preceding equivalent calendar window. For example, Current month compares with the previous calendar month and Last 3 months compares with the preceding three calendar months. A custom range compares with the immediately preceding range containing the same inclusive number of calendar days.

## Calculations

### Period summary

The summary exposes posted income, posted expenses, `income - expenses`, income/expense counts, the average expense, and the largest expense with its category, account, and financial date. The average is rounded to the nearest whole peso because fractional COP is unsupported; a zero expense count produces zero rather than division by zero.

**Savings rate** (`savingsRateBasisPoints`) is the net result as a share of income, in basis points. It is `null` — never `0` — when the period has no income, because a rate against a zero denominator is undefined and rendering `0%` would read as "saved nothing" rather than "does not apply".

The screen presents net result as the headline with its savings rate and previous-period delta, then income and net expenses as supporting values. Counts, averages and gross/refund totals sit behind a **Show details** disclosure. The previous flat grid gave every metric identical weight, so nothing stood out.

### Income versus expenses

SQLite aggregates posted income and expenses by selected day/month. `fillBuckets` joins those sparse aggregates onto the period's complete bucket list so a day with no activity is an explicit zero — charts depend on this, since a missing bucket would silently compress the time axis. Transfers and voided records never enter the query.

The chart is a **diverging bar chart**: one column per bucket, income above a shared baseline and expenses below it. Selecting a column reveals its exact figures in a readout above the chart; with nothing selected the readout shows the whole period. This replaced a stacked list of one row per bucket, which made a 31-day period roughly 2,400px tall and almost entirely zeros.

### Spending pace

The service also fetches the **previous** period's buckets and `cumulativePace` builds a running total of net expenses for both, aligned index by index. Alignment is positional rather than by date because the periods can differ in length (a 31-day month against a 30-day one); the shorter series ends early rather than being stretched, which would invent data points.

### Spending by weekday

`weekdaySpending` groups net expenses by day of week, Sunday first. `average` divides by how many times that weekday actually occurred in the period, so a period containing five Fridays and four Mondays stays comparable. It requires daily resolution, so month-grouped periods return an empty array and the section is hidden.

### Budget vs actual

`useReportBudgets` reads the budgets feature's monthly read model for every month the period touches and sums the limits per category; `budgetPerformance` pairs those limits with the period's actual category spending. A period covering part of a month still counts that month's whole limit — **budgets are never prorated**, because inventing a daily rate would misrepresent the user's own plan. `monthCount` is surfaced in the UI whenever more than one month is summed.

Categories with a limit but no spending are kept (the useful "nothing spent yet" case). Spending without a limit is not a budget and is left to the category ranking. Status is `over` past the limit, `near` from 80%, otherwise `under`; spending exactly the limit is `near`, not `over`.

This lives in the reports feature rather than the report service because it reads another feature's read model, matching how the screen already composes investments.

### Expenses by category

SQLite groups posted expenses by stable category ID, not category name, then sorts descending by total spent. Each result includes its persisted name/icon, total, transaction count, and percentage of selected-period expenses. Archived categories continue to appear. A defensive `Unknown category` / `other` fallback exists for legacy or damaged historical display data even though current foreign-key restrictions prevent normal category loss. The UI shows the complete ranked list rather than truncating it.

The query groups by `(category, subcategory)` and the service folds those leaf rows upward, so the ranking is identical to what it was before subcategories existed: a category's total always includes every subcategory beneath it. Grouping once and folding — rather than running a second breakdown query — makes "a category's total equals the sum of its parts" true by construction instead of by two queries agreeing. Both levels resolve refunds through the expense they refund with the same `coalesce`, so a refund reduces exactly the leaf its original expense landed in.

Each category row expands to its breakdown, which includes an explicit `No subcategory` bucket for spending recorded on the category itself. Breakdown percentages are relative to the parent category, not to period expenses. A category whose spending carries no subcategory at all gets no breakdown — a single row would only repeat the header — but a category whose spending is entirely one subcategory does, because "all of Transporte was Taxi" is worth seeing.

### Net worth

Net worth at a point is:

```text
sum(all active and archived account opening balances)
+ cumulative posted income through the point
- cumulative posted expenses through the point
```

Signed credit-card opening balances reduce net worth. Transfers are omitted from the aggregate because their source and destination effects are equal and opposite, so total net worth is unchanged. The repository performs a fixed query set: one opening-balance total, one aggregated pre-period effect, and one date-grouped in-period change query. The service starts the series on the day before the selected period and cumulatively applies changes. It does not issue one account/balance query per chart point and does not load individual historical transactions into JavaScript.

Opening balances have no separate effective date in the current schema and are treated as preceding transaction history. This is an existing model assumption.

### Previous-period comparison

Income, expenses, net result, average expense, and expense count show current value, signed absolute difference, direction, and percentage change when the previous value is nonzero. Percentage change is unavailable when a zero baseline makes it mathematically undefined; the UI never emits `Infinity` or `NaN`. When the preceding period has no posted income or expenses, it explicitly says **No previous-period data**.

Higher income/net result is semantically positive. Higher expenses, average expense, or expense count is semantically negative. The inverse directions use the inverse semantic tone.

## Percentage strategy

Percentages are not persisted. The service calculates integer basis points (`10,000 = 100%`) with `BigInt` intermediates and nearest-basis-point rounding, then converts basis points only for display. Category percentages use total selected-period expenses as the denominator. Previous-period percentage changes use the absolute previous value as the denominator. Zero denominators produce `0` for category shares or `null` for undefined comparison changes.

## Refresh and UI behavior

Reports uses the existing focus/event financial-data refresh hook. It reloads when focused and after transaction, account, or budget invalidation events; background real-time subscriptions are unnecessary. Pull-to-refresh runs the same complete report load. A period change refreshes every section together.

The screen uses the existing theme tokens. Charts live in `src/components/charts/` as presentational primitives with no domain knowledge; their geometry is pure and tested in `tests/charts.test.mjs`.

`react-native-svg` backs the donut and the line/area charts, which need arcs, gradients and curves. The diverging bar chart and the weekday bars are deliberately plain Views instead, so each column is natively tappable. Category spending keeps its complete ranked list below the donut — the ring shows proportion, the list shows detail. Accessible summaries expose totals, start/end values, and extrema without relying only on color.

## Investments

When investment accounts exist, Reports adds an opt-in **Investments** section
(see [investments.md](investments.md)): the current portfolio position (total
value, net contributions, estimated gain/loss, simple estimated return) plus
**realized investment income for the period** — posted income into an investment
account or tagged the seeded Investment Income category. Unrealized valuation
changes raise net worth but are never counted as ordinary Income, and never enter
cash flow, category totals, or Budgets. The net-worth timeline overlays each
investment's valuation adjustment (value − basis of the latest valuation on or
before each point), so the final point matches Home's estimated net worth; the
base net-worth query is unchanged.

## Performance and known MVP limitations

The existing transaction-date, type/date, category, source-account, and destination-account indexes support the current bounded aggregate queries. No migration or speculative status index was added without production query-plan evidence. Expected MVP performance is suitable for a personal ledger with tens of thousands of transactions; query plans should be measured on representative device data before adding indexes or downsampling.

Known limitations:

- Daily custom charts are limited by the service to ranges of 45 days; longer ranges use monthly aggregation.
- Calendar presets cover complete periods, including later dates in the current month/year if future-dated transactions exist.
- Opening balances are modeled as existing before transaction history because accounts do not store an opening-balance date.
- Charts have no pan/zoom, no crosshair, and no per-point tooltip beyond the cash-flow column readout.
- Budget limits are summed per whole month and never prorated, so a partial-month period compares actual spending against a full month's limit.
- The weekday and pace sections need daily buckets, so they are hidden for periods longer than the 45-day daily-grouping limit (pace still renders for monthly buckets, one point per month).
- There is no report export, drill-down, forecast, multi-currency conversion, or background report subscription.
