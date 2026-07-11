# Money Control — Financial Rules

## 1. Status and terminology

This document is the normative source for calculations and financial invariants.

- **Minor unit**: the smallest integer unit stored by the application. Its COP scale is unresolved; see §8.
- **Transaction**: the user-visible business event: income, expense, or transfer.
- **Posting**: a signed change to one account produced by a transaction.
- **Opening balance**: the starting signed amount assigned to an account before its postings.
- **Effective time**: when the user says the transaction occurred; used for history and monthly reporting.

## 2. Confirmed invariants

1. Monetary values must never be stored or calculated with floating-point arithmetic.
2. Every stored amount is an integer number of minor units.
3. A transaction amount is strictly greater than zero. Direction is represented by transaction type and posting sign, not by a negative entered amount.
4. Income creates one positive posting.
5. Expense creates one negative posting.
6. A transfer creates exactly two postings: one negative posting to the source and one equal positive posting to the destination.
7. The signed sum of a transfer's postings is zero.
8. Transfers contribute zero to income totals and zero to expense totals.
9. An account balance is derived from its opening balance and postings; it is not an independently editable cached truth.
10. Accounts and categories referenced by transactions are archived, not physically deleted.
11. Schema evolution occurs only through ordered migrations.

## 3. Integer money representation

### Storage and domain arithmetic

- Persist money in SQLite `INTEGER` columns.
- Represent money at domain boundaries with a dedicated integer-money type or validated integer value, never a decimal JavaScript `number` resulting from arithmetic.
- Parse user-entered decimal text deterministically into integer minor units using string operations.
- Format integer minor units into COP display text using the configured scale.
- Reject input with more fractional digits than the configured scale.
- Reject `NaN`, infinity, exponent notation, and values outside the supported range.

SQLite integers are signed 64-bit, but ordinary JavaScript numbers are only exact through `Number.MAX_SAFE_INTEGER`. The implementation must either enforce a lower safe-integer bound end-to-end or use `bigint` with a verified database binding/serialization strategy. No implicit conversion between `bigint` and `number` is allowed.

### Rounding

MVP operations do not require division or currency conversion. Therefore no rounding should occur in core transaction entry, balances, or monthly totals. If later features introduce division, their rounding mode must be specified before implementation.

## 4. Posting rules

For amount `A`, where `A` is a positive integer minor-unit amount:

| Transaction type | Required postings | Category |
|---|---|---|
| Income | `(destination account, +A)` | Exactly one income category |
| Expense | `(source account, -A)` | Exactly one expense category |
| Transfer | `(source account, -A)` and `(destination account, +A)` | None |

Additional constraints:

- Source and destination accounts for a transfer must differ.
- All postings for one transaction must be created, updated, or deleted in one database transaction.
- A transaction type and its posting shape must agree; malformed shapes are invalid even if their sum happens to be correct.
- Archived accounts/categories remain valid references for existing records but cannot be selected for new transactions by default.
- Editing a transfer replaces both posting amounts and/or accounts atomically.

## 5. Derived calculations

### Account balance

For account `a` at effective cutoff `t`:

```text
balance(a, t) = opening_balance(a) + Σ posting.amount
                                           where posting.account = a
                                           and transaction.effective_at <= t
```

The current balance uses all non-voided/non-deleted transactions. If transaction deletion remains a hard delete, “all transactions” means all currently stored transactions.

### Total balance across accounts

```text
total_balance = Σ opening_balance(active-or-included account)
              + Σ all postings for those accounts
```

A transfer between included accounts changes this total by zero. Product views must explicitly define whether archived accounts are included; the recommended default is to exclude them from the headline while offering an “include archived” view.

### Monthly totals

For month interval `[start, end)` in the app's reporting timezone:

```text
income  = Σ transaction.amount where type = income
expense = Σ transaction.amount where type = expense
net_cash_flow = income - expense
```

- Transfers are excluded by transaction type, never inferred from category labels.
- Expense totals are displayed as positive magnitudes even though expense postings are negative.
- Monthly grouping uses effective time, not creation/update time.
- Boundary logic uses a half-open interval to avoid double counting.

### Category totals

Category totals include only transactions whose type matches the category kind. Archived categories remain part of historical reports.

## 6. Reproducibility and correction

- The transaction/posting history and opening balances are the source of truth.
- No write path may directly “set” a computed current balance.
- A diagnostic recomputation from the complete ledger must equal every displayed balance.
- Denormalized summaries may be added later only as disposable caches that can be rebuilt and verified.
- Changing an opening balance changes every derived historical/current balance. The product must resolve whether to lock opening balances after activity or record corrections as explicit adjustment transactions.

## 7. Validation and database enforcement

Enforce invariants in both the domain layer (clear errors) and, where SQLite supports it cleanly, the schema (defense in depth):

- `CHECK` constraints for transaction type, category kind, positive transaction amount, nonzero posting amount, and archive flags.
- Foreign keys enabled on every connection.
- Restricted deletion for referenced accounts/categories.
- Unique/structural constraints where possible, plus transactional domain validation for the exact number and signs of postings.
- Migration and transfer writes enclosed in SQLite transactions.
- Post-migration integrity checks before normal use.

Database constraints alone cannot conveniently express every cross-row posting invariant. The repository/service operation that writes a transaction owns those checks, and automated tests must cover them.

## 8. Assumptions

- Opening balances may be positive, zero, or negative.
- Income/expense transaction amounts are positive magnitudes.
- Negative resulting account balances are permitted.
- There are no fees or exchange-rate differences on MVP transfers because all accounts use COP.
- The reporting timezone is the device's selected local timezone unless a fixed app timezone is later chosen.
- Created and updated timestamps are audit metadata and do not affect financial totals.

## 9. Unresolved decisions

- Whether COP is stored as whole pesos (scale 0) or centavos (scale 2). This must be decided before the first production schema.
- Whether the domain uses safe integer `number` with enforced limits or `bigint` throughout.
- Whether transaction correction uses edit/delete, void-and-replace, or an immutable adjustment model.
- Whether opening balances have an effective date and whether reports before that date are allowed.
- Whether archived accounts are included in total-balance dashboard figures by default.
- How device timezone changes affect transactions near month boundaries.
- Whether future credit-card accounts need liability-specific presentation; the core signed-posting math need not change.

