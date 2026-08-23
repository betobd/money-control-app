# ADR 0007: Category subcategories (two levels)

Status: accepted. Supersedes the flat category model for classification only; it
does not change any financial invariant.

## Context

Categories are a flat list. Expenses need one more level of detail ("Hogar →
Mercado") without making transaction entry slower and without breaking the
existing category aggregates that Budgets, Reports, Notifications, Data Export
and Backup all depend on.

Constraints discovered in the current code:

- `transactions_shape_valid` ([schema](../../src/database/schema/index.ts)) is a
  single CHECK naming `category_id` per transaction type. SQLite cannot alter a
  CHECK, and rebuilding `transactions` requires the create-copy-swap dance that
  migration `0012` had to perform — including temporarily deleting refund rows
  because of their self-referential `ON DELETE RESTRICT`. That is the riskiest
  operation in this repository and we want to avoid repeating it.
- Refunds carry no category of their own. Reports and Budgets resolve them with
  `coalesce(transaction.category_id, original_transaction.category_id)`, so a
  refund inherits the refunded expense's classification.
- `categories_active_type_name_uidx` enforces name uniqueness per type over
  active rows only.

## Decision

### Model: one table, self-referencing parent (Option B)

`categories` gains a nullable `parent_category_id` referencing `categories(id)`.
A row with a NULL parent is a category; a row with a parent is a subcategory.
Maximum depth is two.

Rejected: a separate `subcategories` table (Option A). It would duplicate the
entire lifecycle machinery already implemented for categories — archive/restore,
active-name uniqueness, icons, seeding, `hasFinancialReferences`, the
permanent-delete guard — as a parallel service, repository, form and screen. It
would add a table to the backup contract and its 1,000-line validator, and it
would push a "category or subcategory?" branch into roughly forty files. Option B
reuses all of it, and promoting a subcategory to a category later is a single
column UPDATE instead of a cross-table move that breaks referential history.

### Transactions store both the parent and the leaf

`transactions.subcategory_id` is nullable; `category_id` keeps its existing
meaning and **always holds the parent**. This is deliberately denormalized: the
subcategory already knows its parent.

The reason is decisive for this codebase: because `category_id` still points at
the parent, **every existing aggregate keeps working unchanged**. Budgets on a
parent, the report category ranking, budget threshold notifications, transaction
filters and the CSV projection required no semantic change. The normalized
alternative — storing only the selected node — would have broken all of them,
because "Hogar" would stop including "Mercado".

Denormalization risks drift between `category_id` and the subcategory's real
parent. A trigger closes that: `subcategory_id`'s parent must equal
`category_id`, verified on insert and update.

### The migration is additive; no table is rebuilt

Verified against SQLite: `ALTER TABLE ... ADD COLUMN` accepts both a `REFERENCES`
clause and a CHECK that reads another column, and the table's pre-existing CHECK
stays enforced afterwards. Migration `0013` therefore only adds columns,
indexes and triggers. No row is copied, no value is transformed, and
`subcategory_id` starts NULL everywhere — which is exactly the required state for
existing history.

The column carries its own guard:

```sql
CHECK (subcategory_id IS NULL OR category_id IS NOT NULL)
```

Transfers and refunds already have `category_id IS NULL` under the original shape
CHECK, so this one constraint also makes it impossible for them to carry a
subcategory. Refunds keep inheriting classification from the original expense,
now for both levels.

### The service settles the pair; screens send one node

`TransactionService.resolveCategorySelection` accepts either the explicit
`(categoryId, subcategoryId)` pair or just the node the user tapped. When
`categoryId` names a subcategory, the parent is inferred, so the stored pair is
always `(parent, leaf)` and never `(leaf, null)`.

Placing this in the service rather than in the entry screen means every write
path is covered by one implementation: manual entry, editing, recurring
materialization and backup restore. Screens never need to understand the
hierarchy, and a mismatched pair such as Transporte + Mercado is rejected with a
readable field error before the database trigger has to fire. The trigger stays
as the backstop.

The consequence for editing: moving a transaction to a subcategory of a different
tree reassigns its `categoryId` automatically, and moving it up to the parent
clears `subcategoryId` while keeping the category. Neither needs an "Otros"
subcategory to exist.

### The category filter is node-scoped

`TransactionListQuery.categoryId` matches `transactions.category_id` **or**
`transactions.subcategory_id`. No second query parameter was added: a parent id
can never appear in `subcategory_id` and a leaf id can never appear in
`category_id`, so a single id is unambiguous. Filtering by a parent still returns
its whole subtree — because `category_id` always holds the parent — and filtering
by a leaf returns only that leaf. Refunds resolve through the expense they
refund, at both levels, reusing the existing coalesce.

### Capture stays one tap for the common case

`CategoryGrid` keeps its two-column grid of **categories only**; subcategories
appear as a chip row under the selected category. A category with subcategories
carries a small chevron so the extra level is discoverable without opening
anything.

The chip row always offers a `None` chip, selected by default. That is the whole
answer to "I do not want to be forced into an 'Otros' subcategory": choosing no
subcategory is a first-class state in the UI, not a fallback, and nothing is
created in the database to represent it.

Changing category always clears the subcategory. A leaf cannot survive a move to
another tree, which is precisely the state that would produce Transporte +
Mercado.

`CategoryPicker` (behind "View All") is the searchable hierarchical selector for
long lists. Every row is selectable, categories included. Search folds accents
via an explicit table rather than `String.prototype.normalize`, so results are
identical on every engine, and it never shows a subcategory without the category
it belongs to.

Editing is the one place the selection is **not** re-resolved against the active
tree: a transaction may legitimately keep a category or subcategory that was
archived after it was recorded, and the form labels it as a historical value.
Everywhere else the selection is re-resolved on every render, so a node archived
in another screen cannot stay silently selected.

### Name uniqueness is scoped to the parent

`categories_active_type_name_uidx` is replaced by

```sql
UNIQUE(type, coalesce(parent_category_id, ''), lower(trim(name))) WHERE is_archived = 0
```

The `coalesce` is required, not cosmetic. A unique index treats NULLs as
distinct, so indexing the raw `parent_category_id` would silently allow two
root categories both named "Hogar" — verified. With the coalesce, "Otros" can
exist under Hogar *and* under Transporte while root names stay unique.

### Lifecycle rules follow the precedents already set

- **Re-parenting a subcategory is blocked once it has financial references.**
  This mirrors the existing rule that a category's type cannot change after
  financial use. The alternatives were rewriting past transactions'
  `category_id` (falsifying closed months) or leaving rows that violate the
  parent-consistency invariant.
- **Archiving is still the answer to "delete".** Archiving a category archives
  its subcategories in the same SQLite transaction; an active child under an
  archived parent is a state the pickers cannot represent.
- **Restore does not cascade.** A subcategory can only be restored while its
  parent is active. Cascading would resurrect subcategories that were archived
  deliberately.
- **Permanent delete** stays limited to nodes with no financial references, and
  `hasFinancialReferences` now also checks `subcategory_id` across transactions,
  recurring rules and recurring occurrences. A parent with any child is never
  permanently deletable.
- **A subcategory inherits its parent's `type`**, enforced by trigger.

### Budgets apply to a node, and nest for display

A budget's `category_id` may now name either a parent or a subcategory.
`UNIQUE(category_id, month)` already means "one budget per node per month", so
the `budgets` table needs no migration.

Scope follows the node:

- A budget on a parent covers its **whole subtree** — subcategorised and
  un-subcategorised spending alike.
- A budget on a subcategory covers **only that subcategory**.

When both exist, the child budget is a sub-limit displayed nested inside the
parent's. The month totals exclude such a sub-limit entirely — **both its limit
and its spending**, not just its limit: a nested child's spending is already
inside its parent's figure, so counting either one twice would inflate the total
and make `percentageUsed` meaningless. A subcategory budget whose parent is *not*
budgeted that month is not nested anywhere and counts normally.

Child spending is therefore counted once even though it appears twice on screen —
once as its own limit, once inside the parent's. The summary card states how many
sub-limits were folded in, because a total that silently omits a limit the user
set would otherwise read as a bug.

The spending subquery is node-scoped, the same idiom as the transaction filter:
one equality per level, joined by `OR`. A parent id can never appear in
`subcategory_id` and a leaf id never in `category_id`, so a budget on a parent
covers its whole subtree while a budget on a leaf covers only that leaf, with no
`CASE` and no second query.

## Migration

Migration `0013_category_subcategories`:

1. `categories.parent_category_id` (nullable, `ON DELETE RESTRICT`).
2. Swap the active-name unique index for the parent-scoped one.
3. `subcategory_id` on `transactions`, `recurring_transactions` and
   `recurring_occurrences`, each with the "requires a category" CHECK.
4. Indexes on `parent_category_id` and each `subcategory_id`.
5. Triggers: maximum depth two, type inherited from the parent, and
   subcategory-parent consistency on the three transaction-shaped tables.

Existing rows are untouched: every new column is NULL, which reads as "category
as before, no subcategory".

## Consequences

- Backup format rises to **v6**: `parentCategoryId` on the category record and
  `subcategoryId` on transactions and recurring records. The migrator fills them
  with null for v1–v5, so existing backup files keep restoring. A v6 file cannot
  be restored by an older build.
- Backup restore must **insert** categories before subcategories and **delete**
  subcategories before categories. Both directions were verified against SQLite:
  a bulk `DELETE FROM categories` reaches a parent before its children and trips
  `ON DELETE RESTRICT`, exactly as refunds do. Depth being capped at two makes
  the two-pass split a complete topological order, so no general sort is needed.
- The validator rejects cycles through the depth rule alone: every parent must
  itself be top-level, so no chain longer than two links can form and a cycle of
  any length would require a row with both a parent and a child. No graph walk.
- Reports keep their category ranking unchanged and gain a per-category
  breakdown with an explicit "No subcategory" bucket. Implemented by grouping the
  existing query at `(category, subcategory)` and folding the leaf rows upward in
  the service, rather than adding a second query: the ranking and the breakdown
  then come from one grouping, so a category's total equals the sum of its parts
  by construction. Both levels resolve refunds through the same `coalesce`.
- Sub-subcategories are out of scope and blocked at the database level.
