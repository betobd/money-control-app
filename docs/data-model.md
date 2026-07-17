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

Persisted transactions are never hard-deleted. Voided transactions remain visible in history and are excluded from every balance and report. Posted transactions may be edited in place while preserving `id` and `created_at`; edits and voiding advance `updated_at`. Voided transactions cannot be edited or restored to posted. The schema validates row shape, while services validate category compatibility and archive state.

Implemented Expense and Income writes store positive whole-COP magnitudes with `destination_account_id = NULL`; transaction type supplies the signed account effect. An implemented transfer is one row with its source in `account_id`, destination in `destination_account_id`, and `category_id = NULL`; it is not duplicated as income and expense rows. The application service revalidates active references, distinct transfer accounts, Bogotá-local date, safe-integer amount, the asset-account available balance, and a trimmed optional note limited to 200 characters. History read models order by financial date, creation timestamp, and ID, all descending; the three values form the stable pagination cursor.

### `transaction_splits`

- `id`, `transaction_id`, `account_id`
- signed integer `amount`
- non-negative `position`

This table is schema foundation only. Split creation and validation are not implemented. Future splits must sum exactly to the parent transaction's required account effect; transfer splits must sum to zero. Account deletion is restricted. The existing transaction-to-split cascade is structural cleanup only and must not be exposed as transaction hard-delete behavior.

### `budgets`

- `id`, `category_id`, `month`, positive safe-integer `limit_amount`
- UTC `created_at`, `updated_at`

Each budget belongs to exactly one category through a restrictive foreign key. `UNIQUE(category_id, month)` prevents two budgets for the same category and month while allowing that category to have a different budget in another month. The category name and icon are the visible label; a separate budget name is not stored. There is no archive column because monthly records are already historical and no separate lifecycle is justified. Removing a Budget deletes only that monthly plan and never its category or transactions. Currency is omitted because the current product supports only COP.

Income-category rejection and active-category eligibility are enforced by `BudgetService` because SQLite cannot express category type or archive state through a normal cross-table `CHECK`. Archived expense categories already referenced remain valid historical relationships, while creation UI lists only active expense categories. Renaming a category preserves the relationship because references use the stable category ID.

Migration 0004 keeps the original direct category relationship, validates that existing legacy budgets reference expense categories, renames `amount` to `limit_amount`, removes the redundant `currency` column, and copies every row through a create-copy-swap migration. No `budget_categories` table is created.

### `recurring_transactions`

- Reusable transaction template shape for expense, income, or transfer.
- Frequency (`daily | weekly | monthly | yearly`) plus a positive interval; every two weeks is stored as weekly with interval `2`.
- Bogotá-local `start_date`, `next_occurrence_date`, and optional inclusive `end_date`.
- `is_active` distinguishes active from paused; `ended_at` distinguishes a terminal rule from a paused rule.
- UTC `created_at`, `updated_at`, and optional `ended_at`.

Rules do not reserve funds and never post transactions automatically. Active references are validated when a rule is created or edited. Editing a rule affects only dates that have not yet been materialized as occurrences.

### `recurring_occurrences`

- Stable ID, parent recurring-rule ID, and Bogotá-local `scheduled_date`.
- Status (`pending | posted | skipped`).
- Snapshot of the rule's transaction shape, so one pending occurrence can be edited without mutating the rule or sibling occurrences.
- Optional `transaction_id`, required exactly when status is `posted`.
- UTC `created_at` and `updated_at`.

`UNIQUE(recurring_transaction_id, scheduled_date)` makes generation idempotent. Confirmation inserts the normal posted transaction and links the occurrence in one SQLite transaction. Skipped occurrences remain audit history and have no transaction link or financial effect.

### Migration metadata

Drizzle's `__drizzle_migrations` journal is the sole migration authority. Applied migrations are never edited; later changes receive new ordered migrations.

## 3. Derived models

- Account balances use opening balance plus posted income, minus posted expenses, and equal source/destination effects for posted transfers. Voided transactions are excluded.
- Net worth sums active and archived account balances; archived zero balances have no numerical effect.
- Monthly income and expense use `transaction_date`, transaction type, and `status = posted`.
- Transfers and voided transactions contribute zero to income and expense reporting.
- History retains both posted and voided records and labels their status.
- Budget spending uses posted expense transactions whose `category_id` equals the budget's category and whose `transaction_date` is inside the budget month. `created_at` is irrelevant to budget attribution. The repository derives this value from persisted transactions; it is not stored as a mutable total.
- Pending and skipped recurring occurrences never affect balances, budgets, Home totals, or transaction history. A confirmed occurrence affects those read models only through its linked normal posted transaction.
- Reports derive summaries, cash-flow buckets, category rankings, and net-worth changes from posted transactions and `transaction_date`. Report percentages and comparison values are transient service results and are never persisted.

## 4. Indexes

The schema indexes transaction date, `(type, transaction_date)`, source and destination account references, category references, split account references, budget month, unique budget category/month, recurring next date, occurrence status/date, occurrence rule/status, and occurrence account/category references. The transaction date/type/category indexes also support the current bounded reporting aggregates. No reporting-specific index is added without real query plans and production-sized measurements. FTS or normalized-search indexes should follow the same evidence threshold.

## 5. Lifecycle rules

- Archiving is reversible and preserves accounts/categories and their history. Restoring an account preserves its ID, references, and derived balance.
- Permanent account deletion is limited to unused accounts with zero opening and derived balances and no references in transactions, transaction splits, recurring templates, or other financial history. Referenced accounts are retained, and existing `ON DELETE RESTRICT` foreign keys are not weakened.
- Persisted transactions transition from posted to voided; they are not deleted.
- The implemented lifecycle has no `voided → posted` transition. Corrections to a voided record require a future new transaction workflow rather than unvoiding.
- Recurring occurrences transition from pending to exactly one terminal state: posted or skipped. Posted and skipped occurrences cannot return to pending.
- Pausing a recurring rule is reversible and does not backfill the paused interval when resumed. Ending is terminal and preserves all existing occurrences.
- Due-occurrence generation runs when the Recurring screen loads, catches up through the current Bogotá date, and creates at most 100 occurrences per rule per load. A later load continues from the saved cursor when a larger backlog remains.
- Opening balance becomes immutable after the first posted account transaction.
- Corrections after activity use a future adjustment transaction.
- Split behavior remains outside this implementation phase.

## 6. Remaining modeling decisions

- Adjustment transaction representation.
- Optional `voided_at`, void reason, and audit metadata.
- Default categories and their editability.
- Archived-account inclusion in headline totals.
- Safe-integer `number` versus verified `bigint` domain APIs.
