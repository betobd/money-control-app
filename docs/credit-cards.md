# Money Control — Credit Card Management v1

## Financial model

Credit cards use the existing account and transaction model. A negative signed account balance is debt; a positive balance is card credit. Purchases and card charges are ordinary expenses. A payment is one posted transfer from another account to the card, so it never counts as income, expense, category spending, or budget spending and preserves total net worth.

Current debt is `max(-signedBalance, 0)`: the total currently owed from transactions recorded in Money Control. It is distinct from the latest manually entered bank statement balance. Statement balance is copied from the bank's latest bill, and minimum payment is copied from the bank rather than calculated by Money Control. Statement balance and minimum payment never alter account balance, reports, budgets, or net worth.

## Setup and existing cards

`accounts` retains the released `credit_limit` field and adds nullable `statement_closing_day` and `payment_due_day`. Keeping the limit in `accounts` avoids a destructive table rewrite and a duplicate source of truth. New and edited cards require a positive safe-integer limit and whole-number days from 1 through 31. Non-card saves clear all card fields.

Migration `0007_credit_card_management` leaves existing cards usable and invents no limit, cycle date, or statement. A card missing required metadata is setup-incomplete: transactions continue to work, but cycles and reminders remain unavailable. A card with statement history cannot change to a non-card type because that would discard the statements' meaning.

## Billing cycles

Cycle dates are pure Bogotá-local `YYYY-MM-DD` calendar values. The intended day is preserved. A shorter month uses its last day; later months return to the intended day.

The previous close is this month's clamped closing date when today is on or after it, otherwise last month's. The latest closed period starts one day after the preceding close and ends on the previous close. A due date is the first clamped configured due day strictly after its close. Thus a July 15 close with due day 5 is due August 5. Closing day 31 becomes February 28 in 2026 and February 29 in 2028; a March 31 close with due day 31 is due April 30.

## Statements and payment attribution

`credit_card_statements` preserves one row per card and closing date. Corrections update that row; the app exposes no statement deletion. Each row stores period, closing/due dates, non-negative balance and minimum payment, and audit timestamps. Minimum payment cannot exceed statement balance. A new form pre-fills only cycle dates: statement balance and minimum payment remain blank until the user intentionally copies them from the bank. A stored zero is therefore a deliberate zero-balance or no-minimum-due value, not an invented default.

With no saved statement, card details say that no bank statement has been recorded and payment choices do not present zero as bank data. Statement statuses distinguish upcoming, balance due, partially paid, minimum covered, paid, overdue, and an intentional zero-balance statement. `Paid` depends on attributed transfers, never current card debt alone.

Attribution is an explicit MVP date-based approximation:

- only posted transfers into that card which are effective on or before the viewed date count;
- the transfer must be after the later of period end and closing date;
- transfers through the due date are tracked as on-time;
- later transfers still reduce displayed remaining but are tracked separately;
- voided, pre-close, other-card, and non-transfer credits do not count;
- remaining clamps at zero and overpayment is retained separately.

Minimum paid is the lesser of qualifying payments and the saved minimum. Minimum remaining is `max(minimumPayment - qualifyingPayments, 0)`. A saved zero minimum means no minimum is currently due; it is not a payable option.

Without explicit payment-to-statement links this is not issuer-level allocation accuracy. Statement payment attribution is estimated from card payments recorded after the statement closing date; the bank remains the authoritative source. `Paid` means qualifying transfers cover the statement, while `paidOnTime` distinguishes late coverage.

## Guided payment and overpayment

The Pay credit card flow fixes the destination and accepts an active non-card source, payment option, amount, Bogotá-local date, and optional note. Every option has explicit availability rather than using amount zero as a sentinel:

- Minimum payment is available only for a positive saved minimum with positive minimum remaining.
- Remaining statement is available only when a saved statement has a positive unpaid amount.
- Current total debt is available only when transaction-derived debt is positive.
- Other amount is available for an explicitly entered positive whole safe COP amount.

Unavailable options stay visible with a reason and cannot be selected. The review shows the resolved amount, source balance, current and expected debt, current and expected statement remaining, and whether extra payment will reduce newer charges. The service independently recalculates availability and delegates to `TransactionService.create`, which revalidates source funds and creates exactly one normal transfer.

Overpayment remains allowed. A payment above current debt requires explicit confirmation and states the excess; confirmation may produce a positive signed card balance.

## Utilization

Available credit is `creditLimit - currentDebt` and may exceed the limit when the card has a positive balance. Utilization uses integer basis points with `BigInt` intermediates. Only the visual bar clamps to 100%. Missing, zero, or historical invalid limits show unavailable rather than `NaN` or infinity.

Guidance statuses are Low below 30%, Moderate from 30% to below 50%, High from 50% to below 80%, Very high from 80% to below 100%, and Over limit at 100% or more. They are not universal credit-score rules.

## Notifications and backup

Card reminders are off by default and use `credit-card-reminders`. Users may enable one-day-before closing plus due reminders three days before, one day before, and due today. Reconciliation cancels archived, paid, and stale work. Private content hides card and amount; Detailed may show nickname, date, and statement remaining but never notes or full identifiers. Taps pass through App Lock. No exact-alarm permission is used, so Doze/OEM delays remain possible.

Logical backup v2 adds cycle fields and `creditCardStatements`. V1 restores through an in-memory migration that supplies null cycle fields and an empty statement list; no history is invented. Device schedule IDs remain excluded, while restore preserves App Lock and current-device notification preferences and rebuilds schedules.

## Known limitations

V1 records each purchase as one full expense and intentionally does not model installment schedules or infer issuer allocation. It also excludes automatic interest or minimum-payment calculation, cash advances, refinancing, rewards, statement import, bank sync, multi-currency cards, tax handling, issuer formulas, and linked refunds. A direct card credit must use an existing transaction behavior and may distort income reporting; linked refunds remain future work.
