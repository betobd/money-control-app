# ADR 0004: One category per monthly budget

- Status: Accepted
- Date: 2026-07-13

## Context

Transactions already contain the facts required for budget attribution: type, status, category, and transaction date. The MVP needs predictable monthly limits without manual transaction assignment, overlapping category sets, or a second source of truth.

A multi-category budget plan was explored locally but was not committed or released. It introduced a separate budget name and a `budget_categories` join table even though the category is already the stable financial classification used by transactions. That extra membership layer made overlap and double-counting prevention more complex than the MVP requires.

## Decision

Each monthly budget belongs to exactly one expense category:

```text
budgets(
  id,
  category_id,
  month,
  limit_amount,
  created_at,
  updated_at
)
```

The category name and icon are the visible budget label. Budgets do not store a user-defined name or an archive flag. SQLite enforces a restrictive category foreign key and `UNIQUE(category_id, month)`. The same category may have another budget in a different month.

Transactions never store or select a budget ID. A transaction is attributed automatically only when it is a posted expense, its category equals the budget category, and its `transaction_date` belongs to the budget month. Income, transfers, voided transactions, and other months contribute zero. `created_at` is audit metadata and never determines budget attribution.

## Why this prevents overlap

The direct category/month unique constraint means there is at most one destination budget for any category in a month. A qualifying transaction therefore cannot be attributed to two budgets under this model. Monthly budget summaries can sum posted expenses in the set of budgeted categories without joining through a many-to-many table or deduplicating memberships.

## Historical categories

The category foreign key uses restrictive deletion so historical budgets remain valid. Archived categories already referenced stay visible on historical budgets. Creation services and forms accept only active expense categories; income-category and archive-state eligibility remain application rules because SQLite cannot express them with a normal cross-table `CHECK`.

## Future presentation and classification

Optional visual groups such as Leisure or Household may later present multiple independent category budgets together. Such a group is presentation metadata only: it must not own transactions, replace category/date attribution, or make one transaction count more than once.

Cross-cutting cases such as trips, weddings, renovations, or events may later use tags or projects. Tags/projects would classify transactions across normal categories without changing the one-category budget relationship. Budget groups, tags, and projects are outside the current phase.

## Migration

The explored multi-category migration was uncommitted and was applied only to a disposable local emulator database. It is replaced before release rather than retained in migration history. Migration 0004 upgrades the committed one-category schema by validating existing expense-category references, renaming `amount` to `limit_amount`, removing the redundant COP currency column, copying all rows, and restoring the direct foreign key and category/month unique index.

A local database that already executed the discarded multi-category 0004 must be reset before using the replacement migration. Released migrations 0000–0003 are unchanged.

## Consequences

- Budget attribution is deterministic from category and financial date.
- Database-enforced category/month uniqueness prevents overlap and double counting.
- Category renames automatically update the visible label without changing references.
- A plan spanning several categories requires several independent category budgets, optionally grouped visually in a future phase.
- The functional slice uses a repository/service boundary, SQLite aggregation, focus/event invalidation, a create/edit/remove modal, selected-month Budgets UI, and a shared Home summary.
