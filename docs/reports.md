# Money Control — Reports

## Scope and navigation

Reports is a persisted SQLite-backed vertical slice available from **More → Reports** at `/reports`. It does not add a bottom-navigation destination; Home, Transactions, Add, Accounts, and Budgets remain the only five primary navigation items.

The implemented reports are period summary, income versus expenses over time, expenses by category, net worth evolution, and previous equivalent period comparison. CSV export, backup/restore, synchronization, authentication, tax reporting, forecasting, bank integrations, AI insights, and advanced analytics remain outside this slice.

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

The summary exposes posted income, posted expenses, `income - expenses`, income/expense counts, the average expense, and the largest expense with its category, account, and financial date. The average is rounded to the nearest whole peso because fractional COP is unsupported; a zero expense count produces zero rather than division by zero. No budget summary is shown because the available budgets are monthly and would be misleading for arbitrary report windows.

### Income versus expenses

SQLite aggregates posted income and expenses by selected day/month. The service fills absent buckets and calculates each bucket's net result. Transfers and voided records never enter the query.

### Expenses by category

SQLite groups posted expenses by stable category ID, not category name, then sorts descending by total spent. Each result includes its persisted name/icon, total, transaction count, and percentage of selected-period expenses. Archived categories continue to appear. A defensive `Unknown category` / `other` fallback exists for legacy or damaged historical display data even though current foreign-key restrictions prevent normal category loss. The UI shows the complete ranked list rather than truncating it.

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

The screen uses the existing theme tokens and React Native primitives. No chart dependency was added. Cash flow uses labeled grouped bars, category spending uses a complete ranked horizontal-bar list, and net worth uses a dependency-free line plot plus a scrollable textual point summary. Accessible summaries expose totals, start/end values, and extrema without relying only on color.

## Performance and known MVP limitations

The existing transaction-date, type/date, category, source-account, and destination-account indexes support the current bounded aggregate queries. No migration or speculative status index was added without production query-plan evidence. Expected MVP performance is suitable for a personal ledger with tens of thousands of transactions; query plans should be measured on representative device data before adding indexes or downsampling.

Known limitations:

- Daily custom charts are limited by the service to ranges of 45 days; longer ranges use monthly aggregation.
- Calendar presets cover complete periods, including later dates in the current month/year if future-dated transactions exist.
- Opening balances are modeled as existing before transaction history because accounts do not store an opening-balance date.
- The net-worth chart is a lightweight view-based line plot, not an interactive analytics chart.
- There is no report export, drill-down, forecast, budget overlay, multi-currency conversion, or background report subscription.
