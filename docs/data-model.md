# Money Control — Data Model

## 1. Status

This is a proposed logical and SQLite data model for the MVP. It is not an implemented schema. Confirmed financial invariants come from [financial-rules.md](financial-rules.md).

## 2. Design summary

Use a transaction header plus signed account postings:

```text
accounts 1 ───< postings >─── 1 transactions >─── 0..1 categories
```

- Income: one positive posting.
- Expense: one negative posting.
- Transfer: one negative and one equal positive posting.

This separates the user-visible event from its account effects, makes transfer conservation explicit, and allows balances to be recomputed with a sum.

## 3. Proposed entities

### `accounts`

| Column | SQLite shape | Rules/purpose |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | App-generated stable ID |
| `name` | `TEXT NOT NULL` | Trimmed, non-empty display name |
| `type` | `TEXT` | Optional controlled account type; unresolved |
| `currency_code` | `TEXT NOT NULL` | `COP` in MVP |
| `opening_balance_minor` | `INTEGER NOT NULL` | Signed integer minor units |
| `archived_at` | `TEXT NULL` | Null means active; timestamp means archived |
| `created_at` | `TEXT NOT NULL` | UTC audit timestamp |
| `updated_at` | `TEXT NOT NULL` | UTC audit timestamp |

Proposed constraints:

- Currency is `COP` for MVP.
- Normalized account names should be unique among active accounts if the product confirms that behavior.
- Physical deletion is restricted when postings reference the account.

### `categories`

| Column | SQLite shape | Rules/purpose |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | App-generated stable ID |
| `name` | `TEXT NOT NULL` | Trimmed, non-empty display name |
| `kind` | `TEXT NOT NULL` | `income` or `expense` |
| `color` | `TEXT NULL` | Optional presentation metadata |
| `icon` | `TEXT NULL` | Optional presentation metadata |
| `archived_at` | `TEXT NULL` | Null means active |
| `created_at` | `TEXT NOT NULL` | UTC audit timestamp |
| `updated_at` | `TEXT NOT NULL` | UTC audit timestamp |

Proposed constraints:

- `kind IN ('income', 'expense')`.
- Normalized `(kind, name)` should be unique among active categories if confirmed.
- Physical deletion is restricted when a transaction references the category.

### `transactions`

| Column | SQLite shape | Rules/purpose |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | App-generated stable ID |
| `type` | `TEXT NOT NULL` | `income`, `expense`, or `transfer` |
| `amount_minor` | `INTEGER NOT NULL` | Positive magnitude; duplicates posting magnitude intentionally for simple validated reads |
| `currency_code` | `TEXT NOT NULL` | `COP` in MVP |
| `category_id` | `TEXT NULL` | Required for income/expense, null for transfer |
| `note` | `TEXT NULL` | Optional user note |
| `effective_at` | `TEXT NOT NULL` | Reporting/history time; exact format policy unresolved |
| `created_at` | `TEXT NOT NULL` | UTC audit timestamp |
| `updated_at` | `TEXT NOT NULL` | UTC audit timestamp |

Proposed constraints:

- `type IN ('income', 'expense', 'transfer')`.
- `amount_minor > 0`.
- `currency_code = 'COP'` for MVP.
- Transfer category is null; income/expense category is non-null.
- Category kind must match transaction type. This cross-table rule is validated in the domain/repository write operation and covered by tests.

Why retain `amount_minor` when postings also have amounts: it records the entered business amount, simplifies list/report queries, and enables consistency checks. The write service must keep it equal to the required posting magnitude.

### `postings`

| Column | SQLite shape | Rules/purpose |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | App-generated stable ID |
| `transaction_id` | `TEXT NOT NULL` | Parent transaction; cascade on transaction deletion if hard deletion is chosen |
| `account_id` | `TEXT NOT NULL` | Affected account; restrict account deletion |
| `amount_minor` | `INTEGER NOT NULL` | Signed, nonzero account delta |
| `position` | `INTEGER NOT NULL` | Stable order/role within transaction |

Proposed constraints:

- `amount_minor <> 0`.
- Unique `(transaction_id, position)`.
- Unique `(transaction_id, account_id)` prevents a transfer to the same account and duplicate postings.
- Foreign keys to transactions and accounts.

The exact one-versus-two posting count and sign pattern is a cross-row invariant enforced by the transaction write service inside one SQLite transaction. Optional triggers may add defense in depth but must not be the only readable specification.

### `schema_migrations`

| Column | SQLite shape | Rules/purpose |
|---|---|---|
| `version` | `INTEGER PRIMARY KEY` | Monotonically increasing migration number |
| `name` | `TEXT NOT NULL` | Human-readable identifier |
| `applied_at` | `TEXT NOT NULL` | UTC timestamp after successful application |

Migration metadata may alternatively use SQLite `PRAGMA user_version`; a table provides better auditability. The implementation should choose one canonical mechanism, not both as competing truths.

## 4. Derived read models

These are SQL query results, not mutable tables in MVP.

### Account balance

```text
account id/name/state/opening balance + SUM(postings.amount_minor)
```

Use a left join so an account with no transactions still returns its opening balance.

### Transaction history row

```text
transaction header + category label + one/two account names + posting direction
```

Order by `effective_at DESC`, then a stable tie-breaker such as `created_at DESC, id DESC`.

### Monthly dashboard

```text
income total, expense total, net cash flow, expense totals grouped by category
```

Filter on a half-open effective-time interval and transaction type. Do not derive income/expense from posting signs because transfers also contain both signs.

## 5. Proposed indexes

Start with indexes supporting confirmed access paths, then validate with query plans:

- `transactions(effective_at DESC)`
- `transactions(type, effective_at DESC)`
- `transactions(category_id, effective_at DESC)`
- `postings(account_id, transaction_id)`
- `postings(transaction_id)` (may already be covered depending on index order)
- Partial indexes for active account/category names if uniqueness is confirmed and supported by the chosen SQLite version.

## 6. Lifecycle rules

- Archiving sets `archived_at`; restoring clears it.
- Archived records remain joinable and visible in history.
- New transactions should reject archived references by default.
- Foreign-key deletion rules prevent physical deletion of referenced accounts/categories.
- Transaction correction behavior is unresolved. If hard deletion is selected, postings cascade with their transaction atomically. If voiding is selected, add explicit status/reversal fields via a migration rather than overloading `updated_at`.

## 7. Example posting shapes

For COP amount `A = 50,000` in the chosen minor-unit scale:

| Event | Transaction | Postings | Net across accounts |
|---|---|---|---:|
| Salary received | `income`, `A` | checking `+A` | `+A` |
| Groceries paid | `expense`, `A` | cash `-A` | `-A` |
| Cash withdrawal | `transfer`, `A` | checking `-A`; cash `+A` | `0` |

## 8. Assumptions

- IDs are app-generated text identifiers to avoid reliance on row IDs and ease future export/sync, though sync is not MVP.
- There is one currency per transaction and account, fixed to COP in MVP.
- Split transactions are out of scope, so income/expense has exactly one category.
- Notes are plain text and optional.
- No persisted balance or dashboard-summary columns exist initially.

## 9. Unresolved decisions

- ID format (UUID, ULID, or another stable text ID).
- Whole-peso versus centavo storage scale.
- Safe integer versus `bigint` domain representation.
- Exact effective-date storage: local date plus time/zone metadata, or UTC instant plus captured timezone.
- Account type enum and liability presentation.
- Active-name uniqueness and case/diacritic normalization.
- Default seeded categories and whether they may be edited.
- Hard delete versus void/reversal for transactions.
- Whether opening balance needs an effective date or should instead be a system transaction.
- Whether `amount_minor` on the transaction header is accepted denormalization or should be derived from postings.

