# Money Control — Testing Strategy

Two complementary layers, both runnable from a dev machine without a device.

## 1. Behavioral unit/service tests (Node + tsx)

`node --import tsx --test tests/*.test.mjs` runs pure TypeScript service/domain logic against in-memory fakes. These assert **product behavior**, not implementation detail:

- Accounts, Categories, Transactions, Transfers, Refunds, Budgets, Reports, Recurring, Credit cards, Notifications, Backup, Data Export, App Lock.
- Investments (`tests/investments.test.mjs`, `tests/investment-portfolio.test.mjs`, `tests/investment-net-worth.test.mjs`): account/valuation creation and validation, basis-snapshot current value, estimated gain/loss and simple return (unavailable rules), COP/USD portfolio consolidation and missing-rate incomplete, internal-transfer neutrality, net-worth neutrality of contributions/withdrawals, valuation raises/lowers net worth without double counting, and reinvested income as realized basis. Reports investment income + net-worth valuation overlay live in `tests/reports.test.mjs`.
- Currency & rates (`tests/currency.test.mjs`, `tests/exchange-rate.test.mjs`): money parsing/formatting, scaled-integer conversion and deterministic rounding, the Frankfurter provider (validation, HTTP/timeout/network mapping, no financial data sent), and the exchange-rate service (freshness, cached fallback, manual rate, duplicate-refresh prevention, last-valid-rate preservation).
- USD income/expense/refund, same- and cross-currency transfers, and rate-snapshot behavior are covered in the transactions/refunds suites.
- Date utilities (Bogotá-local, no UTC drift) and safe-integer money utilities.
- Financial invalidation events.
- User-safe error mapping (`tests/user-error.test.mjs`): curated domain messages pass through; raw SQLite/constraint/safe-integer/undefined-field text is replaced with a neutral fallback.
- Write serialization (`tests/transactions.test.mjs`): two concurrent transfers from one source cannot both commit and overdraw it.

## 2. SQLite integration + migration tests (Python)

`python tests/*_database_test.py` apply the real ordered migrations to a fresh SQLite database and assert schema constraints, triggers, derived balances, and backup/restore behavior against the actual engine — including foreign-key enforcement that in-memory fakes cannot reproduce.

Key coverage:
- Migration chain from empty database; data preservation and `PRAGMA foreign_key_check`/`integrity_check`.
- `multi_currency_migration_database_test.py`: migration `0009` preserves all COP data and totals, backfills `base_amount_minor`/transfer legs, creates `exchange_rates`, allows USD while rejecting EUR and rateless USD, and confirms Reports/Budgets aggregate the COP snapshot.
- `backup_restore_database_test.py`: atomic restore, rollback on simulated failure, and restore **over an existing database that already contains a linked refund** (guards the self-referential `ON DELETE RESTRICT` delete-order fix).
- Refund migration, credit-card, budget schema, notifications, and data-export projections.
- `investments_migration_database_test.py`: migration `0012` preserves all data, accepts the `investment` account type, and enforces the investment/valuation CHECKs (enums, currency, value, maturity/start, one valuation per account+date). `investments_reports_database_test.py`: realized-investment-income attribution (account vs category, voided/out-of-period excluded) and the value-minus-basis valuation series. `backup_restore_database_test.py` now round-trips the investment tables through atomic restore/rollback.
- `category_subcategories_migration_database_test.py`: migration `0013` preserves every existing row and every derived total, keeps `subcategory_id` null throughout, and enforces the depth-two limit, inherited type, parent-scoped name uniqueness, and subcategory-parent consistency on all three transaction-shaped tables. `transactions_database_test.py` and `reports_database_test.py` mirror the repositories' node-scoped category filter and leaf-level grouping in raw SQL; the reports test asserts that folding the leaf rows reproduces the category-only ranking exactly. `backup_restore_database_test.py` proves both category ordering rules — a bulk `DELETE FROM categories` trips `ON DELETE RESTRICT`, and a subcategory cannot be inserted before its parent — and exercises the post-restore hierarchy check with the triggers removed.
- `budgets_database_test.py` mirrors the node-scoped budget spending subquery and asserts that a parent budget covers its whole subtree while a leaf budget covers only that leaf, refunds included — and that a sub-limit's spending is a strict subset of its parent's, which is why the month totals must not add them together.

## Conventions

- Tests assert observable outcomes (balances, totals, statuses, messages), not private structure.
- New behavior gets a test that fails before the fix and passes after.
- Financial invariants (refunds ≠ income, transfers ≠ income/expense, voided excluded, whole-integer COP) are asserted at the layer that enforces them.
- Calendar-grid math for the shared date picker is covered by `tests/calendar.test.mjs` (`npm run test:calendar`): six-week grids, adjacent-month padding, leap February, and month/day arithmetic across year boundaries.
- Chart geometry is covered by `tests/charts.test.mjs` (`npm run test:charts`): series projection, flat-series centring, line/area/arc path shapes, and the rules that a donut drops non-positive values and splits a full circle so it still renders.
- Report insights are covered by `tests/report-insights.test.mjs` (part of `npm run test:reports`): savings rate (null without income, never 0), weekday averaging by occurrences, positional pace alignment across periods of different lengths, budget-vs-actual pairing and thresholds, and month spanning.

### Never branch on `instanceof` across a module boundary

`instanceof` compares constructor identity, which only holds while every importer
shares a single module instance. That is not guaranteed: `tsx` keys its module
cache on the **specifier form**, so `./transaction.service`,
`@/features/transactions/transaction.service`, and
`../src/features/transactions/transaction.service.ts` load the same file as up to
three separate modules with three distinct error classes. A translating `catch`
then silently fails its `instanceof` check and rethrows the raw error — the app
behaves correctly under Metro (which dedupes by absolute path) while the test
reports a wrong error type.

Error classes crossing a feature boundary therefore carry a readonly brand and
export a type guard, and both production code and tests use the guard:

| Error | Guard |
|---|---|
| `TransactionValidationError` | `isTransactionValidationError` |
| `RecurringRuleValidationError` | `isRecurringRuleValidationError` |
| `AppLockConfigurationError` | `isAppLockConfigurationError` |
| `ExchangeRateProviderError` | `isExchangeRateProviderError` |

Plain `instanceof` remains fine **within** one module (for example a screen
catching an error thrown by the service it imports directly).

### Inject collaborators instead of observing module singletons

`TransactionService` and `BudgetService` accept a `notifyChanged` function
defaulting to `notifyFinancialDataChanged`. Tests inject a recorder rather than
calling `subscribeToFinancialDataChanges`, for the same module-identity reason:
a subscription registered from a test file can land on a different listener set
than the one the service publishes to.

## Running everything

The per-feature `npm run test:*` scripts pair the Node suite with the matching Python suite. For a full pass, run all `tests/*.test.mjs` and every `tests/*_database_test.py`.
