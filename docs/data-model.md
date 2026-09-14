# Money Control — Data Model

## 1. Implemented foundation

Migration 001 is the unreleased initial Expo SQLite schema managed by Drizzle ORM. IDs are application-generated UUID strings stored as `TEXT`. Money is stored as safe-range SQLite integers representing whole Colombian pesos.

`created_at` and `updated_at` are UTC ISO 8601 timestamps. `transaction_date` is an independent Bogotá-local calendar date stored as `YYYY-MM-DD`; it is never derived from an audit timestamp.

The portable backup model mirrors all eight application-owned financial/statement tables using camel-cased logical fields, but deliberately excludes physical SQLite/Drizzle migration metadata. Restore targets the already-migrated current schema and preserves IDs and relationships exactly. See [backup-and-restore.md](backup-and-restore.md) for the versioned contract.

## 2. Tables

### `accounts`

- `id`, `name`, controlled `type`, `currency`
- integer `opening_balance`; optional integer `credit_limit`
- optional integer `statement_closing_day` and `payment_due_day` for credit cards
- `is_archived`, `archived_at`
- UTC `created_at`, `updated_at`

As of migration `0014` ([ADR 0008](decisions/0008-configurable-base-currency.md)) `currency` is constrained by *shape* — a three-letter uppercase code — rather than by an enumerated list; the supported set lives in the TypeScript currency registry and is enforced by the repositories, so adding a currency is not a migration. All existing integer money columns (`opening_balance`, `credit_limit`, and every transaction/statement amount) are **minor-unit** values — COP has `minorUnitFactor = 1` (whole pesos) so existing values are unchanged, and USD has `minorUnitFactor = 100` (cents). Physical column names are kept; `*Minor` naming is used in TypeScript models and newly added columns. An account's currency is immutable once it has financial history. Referenced accounts cannot be physically deleted. Opening balance is editable only before the account has any posted transaction; future service logic enforces that history-dependent rule.

The Accounts service trims names and enforces case-insensitive uniqueness among active accounts. Migration 002 adds a partial unique index on `lower(trim(name))` for active rows as database defense in depth. Archived rows are outside that index and may retain historical duplicate names. Restoration clears the archive fields without changing the account ID and revalidates the name against active accounts.

### `categories`

- `id`, `name`, `type` (`income | expense`), optional `icon`
- `parent_category_id` (nullable self-reference, migration `0013`)
- `is_archived`, `archived_at`
- UTC `created_at`, `updated_at`

Referenced categories cannot be physically deleted. Transaction/category compatibility is deliberately validated by application services rather than a fragile cross-table constraint.

A row with a null parent is a category; a row with a parent is a subcategory. Depth is capped at two by trigger, and a subcategory inherits its parent's `type`. `transactions`, `recurring_transactions` and `recurring_occurrences` each carry a nullable `subcategory_id` whose parent must equal their `category_id`; `category_id` always holds the top-level category, so every existing category aggregate is unchanged. See [ADR 0007](decisions/0007-category-subcategories.md).

Active category names are unique after trimming and case folding within each `(type, parent)` scope: expense and income may each contain the same normalized name, and two different categories may each have an "Otros". Categories may change type only before financial use, and may not be re-parented at all after financial use — moving one would either falsify closed months or leave rows whose subcategory no longer belongs to their category. Archiving a category archives its subcategories in the same transaction; restore deliberately does not cascade, and a subcategory can only be restored while its parent is active. Archived categories remain addressable for history and are excluded from new transaction selection. Permanent deletion is limited to categories with no subcategories and no transaction, budget, recurring-template, or other financial references.

The application seeds eight expense and five income defaults atomically only when the category table is empty. Seeding is idempotent and does not track a separate `is_default` flag; an archived or renamed category keeps the table non-empty and is not recreated.

### `credit_card_statements`

- `id`, restrictive `account_id`
- Bogotá-local `period_start`, `period_end`, `closing_date`, and `due_date`
- non-negative safe-integer `statement_balance` and `minimum_payment`
- UTC `created_at`, `updated_at`

One card has at most one statement per closing date. Statement rows are non-financial metadata: they never create postings or alter balances, budgets, reports, or net worth. See [credit-cards.md](credit-cards.md).

### `transactions`

- `id`
- `type` (`income | expense | transfer | refund`)
- `status` (`posted | voided`), default `posted`
- positive integer `amount` in the account's currency minor units; `currency` is any supported code
- `account_id`; transfer-only `destination_account_id`
- category for income/expense and no category for transfers
- optional `note`
- local `transaction_date` in `YYYY-MM-DD`
- UTC `created_at`, `updated_at`
- Multi-Currency v1 (migration `0009`) adds nullable `base_amount_minor` (base-currency snapshot for income/expense/refund), the exchange-rate snapshot (`exchange_rate_scaled`, `exchange_rate_scale`, `exchange_rate_date`, `exchange_rate_source`), and the transfer destination leg (`destination_amount_minor`, `destination_currency_code`). Migration `0014` adds `base_currency_code` and the rate's own pair (`exchange_rate_base_code`, `exchange_rate_quote_code`) so a snapshot is readable without knowing the current setting. A non-base-currency income/expense/refund requires the base amount + rate snapshot; cross-currency transfers require both leg amounts + a rate. Reports/Budgets/Home aggregate `coalesce(base_amount_minor, amount)`. See [currency-and-rates.md](currency-and-rates.md).

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

Each budget belongs to exactly one category through a restrictive foreign key. `UNIQUE(category_id, month)` prevents two budgets for the same category and month while allowing that category to have a different budget in another month. The category name and icon are the visible label; a separate budget name is not stored. There is no archive column because monthly records are already historical and no separate lifecycle is justified. Removing a Budget deletes only that monthly plan and never its category or transactions. Currency is omitted because a budget limit is always an amount in the base currency.

Income-category rejection and active-category eligibility are enforced by `BudgetService` because SQLite cannot express category type or archive state through a normal cross-table `CHECK`. Archived expense categories already referenced remain valid historical relationships, while creation UI lists only active expense categories. Renaming a category preserves the relationship because references use the stable category ID.

Migration 0004 keeps the original direct category relationship, validates that existing legacy budgets reference expense categories, renames `amount` to `limit_amount`, removes the redundant `currency` column, and copies every row through a create-copy-swap migration. No `budget_categories` table is created.

### `monthly_budgets`

- `id`, `month`, positive safe-integer `limit_amount`, `is_active`
- UTC `created_at`, `updated_at`

The overall monthly spending ceiling (migration 0015, [ADR 0009](decisions/0009-overall-monthly-ceiling.md)). `UNIQUE(month)` allows at most one ceiling per month. It has no category, no color and no foreign key: it is a global cap that already includes every category budget, and its spending is every posted expense minus refunds for the month rather than one category subtree.

A row exists only for a month the user set or cleared a ceiling in. A month with no row of its own inherits the most recent earlier row, so the ceiling carries forward without materializing a row per browsed month, and the view names the month it was inherited from. `is_active = 0` is the tombstone that stops that inheritance from a month onward — deleting instead would let the month fall back to an older ceiling and silently undo the removal. The tombstone keeps the last known `limit_amount` because the `CHECK` requires a positive one.

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

Migrations are **hand-authored** `.sql` files (several include triggers and guard constraints Drizzle Kit does not model). `drizzle-kit generate` is therefore not the source of truth and must not be used to author new migrations — add new ordered files by hand following the existing pattern. The `meta/` snapshot files are complete only for the earliest migrations, so `drizzle-kit generate` diffs against them would be misleading; ignore them when authoring migrations. The runtime migrator uses `_journal.json` plus the bundled `.sql` files and is unaffected. See [known-limitations.md](known-limitations.md).

### `app_settings`

Migration `0014` adds `app_settings`, a singleton row (`id = 'device'`) holding
`base_currency_code`: the currency every consolidated total and every
`base_amount_minor` snapshot is denominated in. It is seeded from the data — an
install that already has accounts was COP and stays COP; an empty one gets a
neutral default — and is changeable only while no transaction or budget exists.
See [ADR 0008](decisions/0008-configurable-base-currency.md).

Migration `0016` adds the nullable `onboarding_completed_at` (UTC, or NULL). NULL
means the first-run welcome flow has not been finished, and the tab layout
redirects to `/onboarding`, where the base currency is chosen before anything can
lock it. Installs that already hold accounts, transactions, budgets or a monthly
ceiling, or whose base is not the seeded `USD`, are backfilled as completed. A
restore also stamps it, keeping the first stamp. It is device state, not part of
the logical backup.

### `exchange_rates`

Migration `0009` adds `exchange_rates`, one row per ordered currency pair holding the
latest valid valuation rate: scaled integer `rate_scaled` / `rate_scale`,
`effective_date`, UTC `fetched_at`, `provider`, and `source` (`frankfurter | manual`).
It holds no personal or financial data and is portable application data (included in
backup v4). See [currency-and-rates.md](currency-and-rates.md).

### `investment_accounts` and `investment_valuations`

Migration `0012` ([investments.md](investments.md), [ADR 0006](decisions/0006-investments-v1.md))
adds the `investment` account type and two tables. `investment_accounts` is 1:1
metadata for an `investment`-type account: `account_id` (primary key and foreign
key to `accounts`), `investment_type`, `tracking_mode` (`balance` only in v1),
`liquidity`, optional `provider_name` / `start_date` / `maturity_date` / `note`,
and audit timestamps (CHECKs enforce the enums, valid dates, and
`maturity_date >= start_date`). `investment_valuations` is the manual market-value
history: `id`, `investment_account_id` (FK to `accounts`), non-negative
`value_minor`, `basis_minor` (a net-contributions snapshot, may be negative),
`currency_code` (any supported code, validated to match the account), `valuation_date`,
optional `note`, audit timestamps, and a unique index on
`(investment_account_id, valuation_date)`. `0012` relaxes the `accounts` type
CHECK to include `investment` via the create-copy-swap pattern (rebuilding
`accounts` and its FK-dependent tables unchanged). Investment accounts still
derive a transaction ledger balance (= net contributions); their **current value**
comes from the latest valuation and is used for net worth (see
[financial-rules.md](financial-rules.md) §16).

### Device-local notification tables

Migration 0006 adds `notification_settings`, `scheduled_notifications`, and `budget_notification_state`. They contain versioned device preferences, Expo schedule identifiers/idempotency metadata, and threshold delivery state. They contain no transaction notes, notification bodies, PIN/security records, or portable financial data and have no financial foreign keys. Logical backup deliberately excludes all three tables; restore preserves preferences and rebuilds device metadata.

## 3. Derived models

- Account balances use opening balance plus posted income, minus posted expenses, and equal source/destination effects for posted transfers. Voided transactions are excluded.
- Net worth sums active and archived account balances; archived zero balances have no numerical effect.
- Monthly income and expense use `transaction_date`, transaction type, and `status = posted`.
- Transfers and voided transactions contribute zero to income and expense reporting.
- History retains both posted and voided records and labels their status.
- Budget spending uses posted expense transactions whose `category_id` **or** `subcategory_id` equals the budget's category and whose `transaction_date` is inside the budget month. A budget on a top-level category therefore covers its whole subtree, and a budget on a subcategory covers only that subcategory; the single id is unambiguous because a parent id can never appear in `subcategory_id` and a leaf id never in `category_id`. `created_at` is irrelevant to budget attribution. The repository derives this value from persisted transactions; it is not stored as a mutable total.
- When a category and one of its subcategories are both budgeted in the same month, the subcategory budget is a sub-limit inside the other. Month totals exclude its limit **and** its spending, because both are already inside the parent's figures; the summary states how many were folded in. A subcategory budget whose parent is not budgeted that month counts normally. See [ADR 0007](decisions/0007-category-subcategories.md).
- The monthly ceiling counts every posted expense minus every posted refund for the month, with no category filter, each row contributing its frozen base-currency snapshot. Transfers stay excluded, which also keeps investment contributions out. `unallocated` is the ceiling minus the category-budget total: money inside the cap that no category budget watches.
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
