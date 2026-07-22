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
- Transaction amounts are positive magnitudes. Direction is represented by transaction type and signed account effects.
- No rounding occurs in initial transaction entry, balances, or reports.
- Expense and Income entry requires a strictly positive safe integer. Stored amounts remain positive; signed presentation and balance effects are derived from transaction type.

## 3. Date and timezone policy

- `transactionDate` is stored as a local calendar date in `YYYY-MM-DD` format.
- The initial reporting timezone is `America/Bogota`.
- `createdAt` and `updatedAt` are UTC ISO 8601 timestamps ending in `Z`.
- Financial dates must never be derived by converting a UTC creation/update timestamp.
- Monthly reporting compares `transactionDate` directly with Bogotá-local calendar boundaries.

## 4. Transaction types and categories

| Type | Account effect | Category |
|---|---|---|
| Income | Increase one account by `A` | Exactly one income category |
| Expense | Decrease one account by `A` | Exactly one expense category |
| Transfer | Decrease source and increase destination by equal `A` | None |

- A transfer's source and destination accounts must differ.
- Transfers contribute zero to income and expense totals.
- Expense transactions may reference only expense categories; income transactions may reference only income categories.
- Category compatibility is enforced by application validation and service-level logic, not cross-table SQL constraints.
- Archived accounts and categories remain valid historical references but are unavailable for new transactions by default.
- New Expense and Income transactions revalidate that both selected references are active at save time. New transfers revalidate that both accounts exist, are active, and differ at save time. Optional notes are trimmed, stored as `NULL` when blank, and limited to 200 characters.
- Checking, savings, and cash accounts may transfer at most their current derived available balance. The service rejects a larger transfer before persistence.
- Credit-card sources are exempt from the insufficient-funds restriction because a negative signed card balance represents debt. A transfer into a credit card increases its signed balance toward zero and may create a positive credit balance when overpaid.
- A credit-card payment is a normal transfer, not a separate transaction type. It does not affect income, expense, or monthly net cash flow.
- Active category names are unique case-insensitively after trimming within their expense or income type. The same name may exist once in each type.
- Category type may change only before the category has financial references. Archiving is reversible; restoring reruns active-name validation.

## 5. Status, deletion, and correction

- Persisted transactions must not be hard-deleted.
- Status is either `posted` or `voided`.
- Only posted transactions affect balances, monthly totals, and category totals.
- Voiding retains the transaction and its historical metadata while removing its financial effect from derived results.
- Explicit reversal transactions may be introduced later but are outside the initial implementation.
- Transaction edits update the existing posted row and preserve its ID and original `createdAt`. Voiding atomically changes the existing row to `voided`; neither operation creates compensating rows.
- Editing a voided transaction and transitioning a voided transaction back to posted are not supported.
- Editing a transfer validates projected balances by first removing the original posted effect and then applying the proposed effect.
- Accounts with posted or voided transactions, transaction references, or any other financial history must never be permanently deleted. Foreign-key restrictions remain defense in depth and transaction history is never cascade-deleted through account actions.
- Categories with transaction, budget, recurring-template, or other financial references must never be permanently deleted.

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

## 11. Monthly budgets

- A budget has an ID, exactly one expense-category ID, a `YYYY-MM` month, a positive safe-integer COP limit, and audit timestamps. It has no separate user-defined name; the category name is its visible label.
- Income categories cannot have budgets. A category may have at most one budget in the same month and may have different budgets in different months.
- Transactions are never manually assigned to budgets and do not store a budget ID. Attribution is derived automatically from category equality and the transaction date.
- A transaction contributes when and only when its type is `expense`, status is `posted`, `transaction.categoryId = budget.categoryId`, and `transactionDate` falls inside `budget.month`. `createdAt` never determines the budget month.
- Transfers, income, voided expenses, and expenses outside the budget month contribute zero.
- Per budget: `spent = Σ qualifying transaction.amount`, `remaining = limitAmount - spent`, and `percentageUsed = spent / limitAmount`.
- Only visual progress width is clamped to 100%. Displayed percentages continue above 100%, and remaining may be negative.
- For a selected month, `totalBudget` is the sum of budget limits. `totalSpent` is the sum of posted expenses in categories that have a budget for that month. Expenses in unbudgeted categories remain normal Home and Transactions expenses but are excluded from budget summary totals.
- The direct category/month uniqueness rule ensures no transaction can count toward more than one budget in the same month.
- Archived categories already referenced by historical budgets remain visible. Archived categories cannot be selected for new budgets, and archive status never changes historical attribution.
- Below 80% is **On track**, 80–99% is **Near limit**, exactly 100% is **Fully used**, and above 100% is **Over budget**.
- Optional future visual groups such as Leisure or Household may display several independent category budgets together, but cannot change attribution or cause double counting. Future tags or projects may model cross-cutting expenses such as trips, weddings, renovations, or events. Groups, tags, and projects are not implemented in the current phase.
- These Budget calculations are implemented by the Budget repository/service read model and are shared by the Budgets screen and Home preview.

## 12. Recurring transactions

- A recurring rule is a reusable template, not a posted transaction and not a balance reservation.
- The app materializes due occurrences only while the application is running and the Recurring screen is loaded. It does not post in the background.
- Every occurrence starts pending. Only explicit user confirmation may create a posted transaction; skipping creates no transaction and no financial effect.
- Confirmation reuses the normal transaction service and therefore revalidates active accounts/categories, category type, distinct transfer accounts, safe amount/date rules, and current transfer funds.
- Transaction insertion and the occurrence's `pending → posted` transition are one atomic repository operation. A failed validation or write leaves the occurrence pending and creates no partial transaction.
- Editing one pending occurrence modifies its snapshot only. Editing a rule affects only future dates that have not been generated.
- Occurrence generation is idempotent by parent rule and scheduled date. Catch-up is limited to 100 occurrences per rule per screen load.
- All scheduled dates use Bogotá-local `YYYY-MM-DD` calendar values. Monthly schedules preserve their original intended day, clamping to month end where necessary; annual leap-day schedules clamp to February's last day and return to February 29 in leap years.
- Paused rules generate nothing. Resuming advances to the first anchored schedule date on or after the current Bogotá date, so the paused interval is not backfilled.
- Ended rules never resume or generate again. Existing pending, posted, and skipped occurrences remain available for review and audit.

## 13. Reports

- Reports use persisted SQLite data and the inclusive Bogotá-local `transactionDate` range selected by the user. Audit timestamps never determine period membership.
- Only posted income and expenses affect period summary, cash-flow, category, and comparison metrics. Transfers and voided transactions contribute zero.
- Average expense is rounded to the nearest whole peso and is zero when no posted expense exists.
- Category percentages use integer basis points and stable category IDs. Archived category history remains included; a defensive unknown-category label is presentation fallback only.
- Net worth includes every active and archived account opening balance plus all posted financial effects through each point. Credit-card debt retains its signed negative convention. Transfers conserve total net worth.
- Net-worth series include the value immediately before the selected period, followed by daily end values for short ranges or month-end values for longer ranges.
- Calendar presets compare with the preceding equivalent calendar window; custom periods compare with the immediately preceding equal-length inclusive day range.
- Percentage changes use integer basis points and are omitted when the previous value is zero. Expense increases are semantically negative even though their numeric difference is positive.

Full reporting behavior and limitations are in [reports.md](reports.md).

## 14. Notification-derived rules

- Recurring notification dates use the existing Bogotá-local rule/occurrence schedule and never create or confirm a financial transaction.
- Budget alerts consume the existing posted-expense budget read model. Income, transfers, and voided transactions do not count.
- Threshold comparison uses integer/`BigInt` intermediates: 80% and 100% crossings do not introduce floating-point monetary arithmetic.
- Notification failure is outside financial transactions and cannot roll back a persisted transaction, occurrence transition, budget, or restore.

## 15. Decisions still unresolved

- Adjustment transaction representation and category treatment.
- Whether voiding records a separate `voidedAt` timestamp or reason in a future migration.
