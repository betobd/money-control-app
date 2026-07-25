# Money Control — Testing Strategy

Two complementary layers, both runnable from a dev machine without a device.

## 1. Behavioral unit/service tests (Node + tsx)

`node --import tsx --test tests/*.test.mjs` runs pure TypeScript service/domain logic against in-memory fakes. These assert **product behavior**, not implementation detail:

- Accounts, Categories, Transactions, Transfers, Refunds, Budgets, Reports, Recurring, Credit cards, Notifications, Backup, Data Export, App Lock.
- Date utilities (Bogotá-local, no UTC drift) and COP safe-integer utilities.
- Financial invalidation events.
- User-safe error mapping (`tests/user-error.test.mjs`): curated domain messages pass through; raw SQLite/constraint/safe-integer/undefined-field text is replaced with a neutral fallback.
- Write serialization (`tests/transactions.test.mjs`): two concurrent transfers from one source cannot both commit and overdraw it.

## 2. SQLite integration + migration tests (Python)

`python tests/*_database_test.py` apply the real ordered migrations to a fresh SQLite database and assert schema constraints, triggers, derived balances, and backup/restore behavior against the actual engine — including foreign-key enforcement that in-memory fakes cannot reproduce.

Key coverage:
- Migration chain from empty database; data preservation and `PRAGMA foreign_key_check`/`integrity_check`.
- `backup_restore_database_test.py`: atomic restore, rollback on simulated failure, and restore **over an existing database that already contains a linked refund** (guards the self-referential `ON DELETE RESTRICT` delete-order fix).
- Refund migration, credit-card, budget schema, notifications, and data-export projections.

## Conventions

- Tests assert observable outcomes (balances, totals, statuses, messages), not private structure.
- New behavior gets a test that fails before the fix and passes after.
- Financial invariants (refunds ≠ income, transfers ≠ income/expense, voided excluded, whole-integer COP) are asserted at the layer that enforces them.

## Running everything

The per-feature `npm run test:*` scripts pair the Node suite with the matching Python suite. For a full pass, run all `tests/*.test.mjs` and every `tests/*_database_test.py`.
