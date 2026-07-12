# Money Control — Financial Rules

## 1. Status and terminology

This document is the normative source for financial calculations and invariants.

- **Peso unit**: one whole Colombian peso. Fractional COP is unsupported in the initial version.
- **Transaction date**: the user-selected local calendar date used for history and reporting.
- **Transaction split**: a signed account effect reserved by the schema for future ledger behavior.
- **Opening balance**: the account's starting signed amount before posted activity.
- **Posted transaction**: an active transaction included in balances and reports.
- **Voided transaction**: retained history excluded from balances and reports.

## 2. Money representation

- All monetary values are integer counts of whole Colombian pesos stored in SQLite `INTEGER` columns.
- `100000` means `$100.000 COP`.
- Fractional values, decimal COP input, floating-point storage, `NaN`, infinity, and exponent notation are invalid.
- JavaScript monetary values use `number` and must pass `Number.isSafeInteger()`. `BigInt` is not used in the Accounts phase.
- Transaction amounts are positive magnitudes. Direction is represented by transaction type and, when implemented, signed account effects.
- No rounding occurs in initial transaction entry, balances, or reports.

## 3. Date and timezone policy

- `transactionDate` is stored as a local calendar date in `YYYY-MM-DD` format.
- The initial reporting timezone is `America/Bogota`.
- `createdAt` and `updatedAt` are UTC ISO 8601 timestamps ending in `Z`.
- Financial dates must never be derived by converting a UTC creation/update timestamp.
- Monthly reporting compares `transactionDate` directly with Bogotá-local calendar boundaries.

## 4. Transaction types and categories

| Type | Account effect when implemented | Category |
|---|---|---|
| Income | Increase one account by `A` | Exactly one income category |
| Expense | Decrease one account by `A` | Exactly one expense category |
| Transfer | Decrease source and increase destination by equal `A` | None |

- A transfer's source and destination accounts must differ.
- Transfers contribute zero to income and expense totals.
- Expense transactions may reference only expense categories; income transactions may reference only income categories.
- Category compatibility is enforced by application validation and service-level logic, not cross-table SQL constraints.
- Archived accounts and categories remain valid historical references but are unavailable for new transactions by default.

## 5. Status, deletion, and correction

- Persisted transactions must not be hard-deleted.
- Status is either `posted` or `voided`.
- Only posted transactions affect balances, monthly totals, and category totals.
- Voiding retains the transaction and its historical metadata while removing its financial effect from derived results.
- Explicit reversal transactions may be introduced later but are outside the initial implementation.
- Future write services must perform status changes and related financial updates atomically.
- Accounts with posted or voided transactions, transaction references, or any other financial history must never be permanently deleted. Foreign-key restrictions remain defense in depth and transaction history is never cascade-deleted through account actions.

## 6. Opening balances

- Opening balances may be positive, zero, or negative.
- Asset opening balances are positive. Credit-card debt is stored internally as a negative balance; the account form accepts the debt as a positive magnitude and normalizes it once when saving.
- An opening balance may be edited only while the account has no non-voided transactions.
- Once posted account activity exists, the opening balance is immutable.
- Later corrections use an adjustment transaction; adjustment behavior is not implemented in the current phase.
- This rule depends on transaction history and is enforced by application/service logic rather than a column constraint.

## 7. Account lifecycle and net worth

- Archiving is reversible. Restoring an account preserves its ID, history, opening balance, and current derived balance, and makes it active again after active-name validation succeeds.
- Permanent deletion is available only for an unused account whose opening and derived balances are both zero and which has no transaction or financial references.
- Archived accounts cannot be selected for new transactions.
- Archived accounts remain accessible through an archived filter or section.
- Archived accounts remain included in net worth while they retain a balance; a zero-balance archived account has no numerical effect.
- Net worth is the direct sum of signed internal balances. Credit-card debt reduces the total, and archiving never changes a balance's sign.
- Account names are trimmed. Active names are case-insensitively unique, while archived historical accounts may retain duplicate names.

## 8. Derived calculations

For account `a` and date cutoff `d`:

```text
balance(a, d) = openingBalance(a)
              + Σ implemented account effects
                where transaction.status = posted
                and transaction.transactionDate <= d
```

Monthly totals in `America/Bogota`:

```text
income  = Σ amount where type = income  and status = posted
expense = Σ amount where type = expense and status = posted
net     = income - expense
```

- Transfers are excluded by type, not inferred from category or sign.
- Voided transactions are always excluded.
- Balances and totals are derived; they are never independently editable cached truth.
- Credit-card cards display the absolute debt magnitude under **Amount owed**. Absolute values are presentation-only and are never used in net-worth calculations.

## 9. Transaction splits

- The `transaction_splits` schema foundation remains, but split creation and validation are outside the current implementation phase.
- Future income/expense splits must sum exactly to the signed parent effect.
- Future transfer splits must contain equal-and-opposite source/destination effects and sum to zero.
- All splits belonging to a transaction must eventually be written atomically.
- No current screen, repository, or service may imply that split behavior is implemented.

## 10. Database enforcement boundary

The database enforces stable row-local rules such as integer ranges, valid enums, transaction shape, date format, foreign keys, and restricted deletion of referenced accounts/categories. Application services must enforce rules requiring other rows or tables, including category compatibility, opening-balance immutability, and future split sums.

Every schema change uses an ordered migration. A released or externally applied migration is immutable.

## 11. Decisions still unresolved

- Adjustment transaction representation and category treatment.
- Whether voiding records a separate `voidedAt` timestamp or reason in a future migration.
