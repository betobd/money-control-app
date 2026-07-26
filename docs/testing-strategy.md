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

## Conventions

- Tests assert observable outcomes (balances, totals, statuses, messages), not private structure.
- New behavior gets a test that fails before the fix and passes after.
- Financial invariants (refunds ≠ income, transfers ≠ income/expense, voided excluded, whole-integer COP) are asserted at the layer that enforces them.

## Running everything

The per-feature `npm run test:*` scripts pair the Node suite with the matching Python suite. For a full pass, run all `tests/*.test.mjs` and every `tests/*_database_test.py`.
