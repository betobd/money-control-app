# ADR 0009: Overall monthly spending ceiling

Status: accepted. Additive on top of [ADR 0004](0004-one-category-monthly-budgets.md);
it changes no existing budget behaviour and no financial invariant.

## Context

Budgets are per category ([ADR 0004](0004-one-category-monthly-budgets.md)), with
optional subcategory sub-limits ([ADR 0007](0007-category-subcategories.md)) and
optional monthly recurrence (migration `0011`). The Budgets summary adds the
category limits together and calls that "Total monthly budget".

That total answers *"did I overspend on the categories I chose to watch?"* — not
*"did I overspend?"*. Any expense in a category with no budget is invisible to
every budget figure in the app: an install can show every budget on track while
spending double its income. There is no screen that states the month's overall
limit, because no such limit exists.

Constraints found in the current model:

- `budgets.category_id` is `NOT NULL` with `UNIQUE(category_id, month)` and a
  restrictive foreign key. SQLite cannot drop `NOT NULL` in place, so making it
  nullable means the create-copy-swap rebuild that `0014` had to perform.
- `BudgetRecord` carries `categoryName`, `categoryIcon`, `categoryParentId` and
  friends, and every read path inner-joins `categories`. A category-less budget
  row would make all of those nullable across the repository, the service, the
  Budgets and Home screens, notifications and data export.
- A category budget's spending is one subtree
  (`sqlite-budget.repository.ts#spendingFor`). The ceiling's spending is every
  expense, so the two share no query.

## Decision

### A separate `monthly_budgets` table, not a nullable `category_id`

The ceiling has no category, no color, no nesting, no recurrence rule and no
shared query with a category budget. Modelling it as a `budgets` row with a null
category would spread nullability through ten files to describe a row that shares
one column with its neighbours.

Migration `0015` therefore only creates a table. Nothing existing is rebuilt,
which is the cheapest and least risky option available here.

### Spending is every posted expense minus refunds

The ceiling is a **global cap that includes the category budgets**, not a bucket
beside them. Its `spent` is every posted `expense` minus every posted `refund` for
the month, with no category filter — the same figure Home's period summary and
Reports already show as net expenses.

Each row contributes its frozen `base_amount_minor` snapshot, so a foreign-currency
expense counts what it cost on the day, never what it would cost at today's rate
([ADR 0008](0008-configurable-base-currency.md)). Transfers stay excluded: they
move money rather than spend it, which also keeps investment contributions out.

### The ceiling carries forward; it is not materialized

A row exists only for a month the user actually set or cleared a ceiling in. A
month with no row of its own reads the most recent earlier row, and
`MonthlyBudgetView.inheritedFrom` names it so an inherited ceiling never looks
like one typed for this month.

This deliberately differs from recurring category budgets (`budget_rules` plus
lazy materialization). A ceiling is a single global value, so there is nothing to
template and no per-category row to create: browsing a month writes nothing.

Setting a ceiling for a month does **not** delete later rows. A December ceiling
set on purpose survives an edit to September; only months that never had one of
their own follow the change.

### `is_active = 0` is a tombstone, not a delete

Removing the ceiling writes an inactive row for that month rather than deleting
rows. Deleting would let the month inherit an older ceiling again and silently
undo the removal. Later rows *are* dropped on removal, so no future ceiling
survives it.

The row keeps its last known `limit_amount` because the `CHECK` requires a
positive one; `is_active` alone carries the meaning.

### `unallocated` is the number worth showing

`limitAmount - categoryBudgetTotal` is the money inside the cap that no category
budget is watching — the spending that motivated this ADR. It is surfaced on the
ceiling card, and reads as a warning when the category budgets alone already
exceed the ceiling.

## Consequences

- Budgets shows the ceiling above the category budgets, including on a month with
  no category budgets at all, which is when it matters most.
- Home's budget card takes the ceiling as its headline when one is set, with the
  category breakdown below it as a subset.
- The backup collection `monthlyBudgets` is **optional**, exactly as `budgetRules`
  was when migration `0011` added it. The logical format stays **v7**: a file
  written before the ceiling existed is still valid and restores with no ceiling.
  `CURRENT_DATABASE_SCHEMA_VERSION` moves to `0015`.
- The ceiling is per month and in the base currency only, like every other budget
  figure.

## Alternatives rejected

**Nullable `category_id` on `budgets`.** Rebuild of the busiest budget table plus
nullability through every consumer, to model a row that shares one column with the
others.

**A `budget_rules` row with a null category.** Same nullability problem, plus a
unique index on `category_id` that a null row does not fit, plus materialization
this feature does not need.

**A ceiling that only counts unbudgeted categories.** Rejected: "my budget for the
month" means the whole month to a user, and a figure that silently excludes the
categories they explicitly planned would be the more surprising of the two.

**Storing one value in settings instead of per month.** Cheaper, but a past month
would then be reported against today's ceiling, which is the same
restate-history mistake ADR 0008 refuses for exchange rates.
