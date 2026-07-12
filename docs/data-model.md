# Money Control — Data Model

## 1. Implemented foundation

Migration 001 is the unreleased initial Expo SQLite schema managed by Drizzle ORM. IDs are application-generated UUID strings stored as `TEXT`. Money is stored as safe-range SQLite integers representing whole Colombian pesos.

`created_at` and `updated_at` are UTC ISO 8601 timestamps. `transaction_date` is an independent Bogotá-local calendar date stored as `YYYY-MM-DD`; it is never derived from an audit timestamp.

## 2. Tables

### `accounts`

- `id`, `name`, controlled `type`, `currency`
- integer `opening_balance`; optional integer `credit_limit`
- `is_archived`, `archived_at`
- UTC `created_at`, `updated_at`

Currency is currently constrained to `COP`. Referenced accounts cannot be physically deleted. Opening balance is editable only before the account has any posted transaction; future service logic enforces that history-dependent rule.

The Accounts service trims names and enforces case-insensitive uniqueness among active accounts. Migration 002 adds a partial unique index on `lower(trim(name))` for active rows as database defense in depth. Archived rows are outside that index and may retain historical duplicate names. Restoration clears the archive fields without changing the account ID and revalidates the name against active accounts.

### `categories`

- `id`, `name`, `type` (`income | expense`), optional `icon`
- `is_archived`, `archived_at`
- UTC `created_at`, `updated_at`

Referenced categories cannot be physically deleted. Transaction/category compatibility is deliberately validated by application services rather than a fragile cross-table constraint.

Active category names are unique after trimming and case folding within each category type; expense and income may each contain the same normalized name. Categories may change type only before financial use. Archived categories remain addressable for history and are excluded from new transaction selection. Permanent deletion is limited to categories with no transaction, budget, recurring-template, or other financial references.

The application seeds eight expense and five income defaults atomically only when the category table is empty. Seeding is idempotent and does not track a separate `is_default` flag; an archived or renamed category keeps the table non-empty and is not recreated.

### `transactions`

- `id`
- `type` (`income | expense | transfer`)
- `status` (`posted | voided`), default `posted`
- positive integer `amount` in whole COP and `currency = COP`
- `account_id`; transfer-only `destination_account_id`
- category for income/expense and no category for transfers
- optional `note`
- local `transaction_date` in `YYYY-MM-DD`
- UTC `created_at`, `updated_at`

Persisted transactions are never hard-deleted. Voided transactions remain visible in history and are excluded from every balance and report. The schema validates row shape, while services will validate category compatibility and archive state.

Implemented Expense and Income writes store positive whole-COP magnitudes with `destination_account_id = NULL`; transaction type supplies the signed account effect. An implemented transfer is one row with its source in `account_id`, destination in `destination_account_id`, and `category_id = NULL`; it is not duplicated as income and expense rows. The application service revalidates active references, distinct transfer accounts, Bogotá-local date, safe-integer amount, the asset-account available balance, and a trimmed optional note limited to 200 characters. Read models order by financial date and then creation timestamp, both descending.

### `transaction_splits`

- `id`, `transaction_id`, `account_id`
- signed integer `amount`
- non-negative `position`

This table is schema foundation only. Split creation and validation are not implemented. Future splits must sum exactly to the parent transaction's required account effect; transfer splits must sum to zero. Account deletion is restricted. The existing transaction-to-split cascade is structural cleanup only and must not be exposed as transaction hard-delete behavior.

### `budgets`

- Category/month unique budget with positive integer whole-COP amount.
- Foundation only; no behavior is implemented.

### `recurring_transactions`

- Transaction template shape, recurrence frequency/interval, next local date, and active state.
- Foundation only; no scheduler or transaction generation behavior is implemented.

### Migration metadata

Drizzle's `__drizzle_migrations` journal is the sole migration authority. Applied migrations are never edited; later changes receive new ordered migrations.

## 3. Derived models

- Account balances use opening balance plus posted income, minus posted expenses, and equal source/destination effects for posted transfers. Voided transactions are excluded.
- Net worth sums active and archived account balances; archived zero balances have no numerical effect.
- Monthly income and expense use `transaction_date`, transaction type, and `status = posted`.
- Transfers and voided transactions contribute zero to income and expense reporting.
- History retains both posted and voided records and labels their status.

## 4. Indexes

The initial schema indexes transaction date, `(type, transaction_date)`, account references, category references, split account references, budget month, and recurring next date. Status-aware composite indexes should be added only when real query plans justify them.

## 5. Lifecycle rules

- Archiving is reversible and preserves accounts/categories and their history. Restoring an account preserves its ID, references, and derived balance.
- Permanent account deletion is limited to unused accounts with zero opening and derived balances and no references in transactions, transaction splits, recurring templates, or other financial history. Referenced accounts are retained, and existing `ON DELETE RESTRICT` foreign keys are not weakened.
- Persisted transactions transition from posted to voided; they are not deleted.
- Opening balance becomes immutable after the first posted account transaction.
- Corrections after activity use a future adjustment transaction.
- Budgets, recurrence, and split behavior remain outside this implementation phase.

## 6. Remaining modeling decisions

- Adjustment transaction representation.
- Optional `voided_at`, void reason, and audit metadata.
- Default categories and their editability.
- Archived-account inclusion in headline totals.
- Safe-integer `number` versus verified `bigint` domain APIs.
