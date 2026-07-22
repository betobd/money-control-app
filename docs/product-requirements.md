# Money Control — Product Requirements

## 1. Purpose

Money Control is a personal, local-first Android application for recording money movements and understanding current account balances and monthly cash flow. The MVP prioritizes trustworthy arithmetic, fast offline use, and an audit-friendly history over automation, collaboration, or cloud features.

This document describes product behavior. Financial invariants are normative in [financial-rules.md](financial-rules.md), the proposed technical design is in [architecture.md](architecture.md), and the proposed storage shape is in [data-model.md](data-model.md).

## 2. Confirmed requirements

### Product and platform

- The product name is **Money Control**.
- The primary user is one person managing their own finances.
- The initial target is Android.
- The application is local-first: core functionality must work without a network connection.
- The initial currency is Colombian pesos (COP).
- MVP data is persisted locally on the device.

### MVP capabilities

#### Accounts

- Create and edit accounts.
- View active accounts and their current balances.
- Preserve accounts that have transaction history by archiving instead of physically deleting them.

#### Categories

- Create and edit categories used to classify income and expenses.
- Preserve categories that have transaction history by archiving instead of physically deleting them.

#### Transactions

- Record income into an account.
- Record an expense from an account.
- Record a transfer between two distinct accounts.
- View transaction history.
- Filter transaction history.
- Preserve enough information to reproduce balances from opening balances and transaction history.

#### Dashboard

- Show a basic monthly dashboard.
- Show account balances.
- Do not count transfers as income or expense.

#### Budgets

- Create, edit, and remove one monthly budget per expense category.
- Use the category name and icon as the budget label; do not require a separate budget name.
- Assign each expense category to at most one budget in the same month while allowing a new limit in another month.
- Derive spending automatically from posted expense transactions; users never select a budget on a transaction.
- Show real monthly budget progress in Budgets and Home, derived from persisted posted expenses for budgeted categories.

#### Reports

- Open Reports from More without adding a sixth bottom-navigation item.
- Show period summary, income versus expenses, expenses by category, net-worth evolution, and previous-period comparison from persisted SQLite data.
- Support current month, previous month, last 3 months, last 6 months, current year, and an inclusive custom Bogotá-local date range.
- Exclude transfers, voided transactions, and unconfirmed recurring occurrences from income/expense reporting.
- Preserve archived account/category history and the signed credit-card debt convention in net-worth reporting.

#### Backup and restore

- Create a complete, versioned logical backup of local financial data and share/save it through Android system UI.
- Preview metadata and record counts before a restore.
- Require explicit destructive confirmation and replace data atomically, never merge or partially restore.
- Preserve IDs, archived records, notes, transaction status, transfers, budgets, and recurring state.
- Reject damaged, incompatible, oversized, or relationally invalid files before changing the database.
- Warn clearly that version 1 backups contain sensitive financial data in plaintext.

#### Local App Lock

- Optionally protect application UI access with an exactly six-digit local PIN.
- Offer strong device biometrics only after PIN creation and current-PIN verification, while retaining the PIN as fallback.
- Lock immediately on demand and after a configured AppState background delay.
- Keep financial routes hidden until SecureStore-backed lock configuration is known and the enabled lock is satisfied.
- Prevent normal Android screenshots and obscure recent-app previews while App Lock is enabled where platform support permits.
- Exclude every App Lock record and secret from financial backup and restore behavior.
- Disclose that App Lock does not encrypt SQLite or plaintext exported backup files.

#### Local notifications

- Configure optional recurring, budget-threshold, and daily-review reminders under More without changing the five-item bottom navigation.
- Request Android notification permission only from an explicit user action and continue normally after denial.
- Keep reminder scheduling, preferences, content, and routing local to the device with Private content as the default.
- Reconcile recurring work idempotently over a bounded window and alert once per 80%/100% budget crossing.
- Preserve App Lock as the gate for notification taps and exclude device notification metadata from portable backups.

### Data integrity

- Monetary values must not use floating-point arithmetic.
- All database schema changes must be applied through migrations.
- A transfer must not change aggregate money across the user's accounts.

## 3. Proposed MVP behavior (assumptions)

These assumptions make the scope implementable but are not yet confirmed product decisions.

- The app is single-user and has no sign-in.
- An account has a name, opening balance, optional visual metadata, and active/archived state.
- A category is classified as either income or expense; transfer records do not use categories.
- A transaction has an amount, effective date/time, optional note, type, and account posting(s).
- Users can edit posted transactions and void them with confirmation. Transactions are never physically deleted; voided records remain in history and are excluded from balances and reports.
- Archived accounts and categories are hidden from normal creation forms and active lists, but remain visible on historical records and can be restored.
- An account cannot be archived if doing so would make an existing transfer invalid; existing history remains readable regardless of archive state.
- History defaults to the current Bogotá-local month and newest-first order. It supports debounced text search plus type, status, account, category, and date-range filters over persisted SQLite data; Clear all restores All time.
- The monthly dashboard uses the device's local calendar month and includes income, expenses, net cash flow, and a category breakdown for expenses.
- Amount input and display use COP formatting and the device locale where practical.
- All writes affecting more than one row, especially transfers, are atomic.

## 4. MVP acceptance criteria

### Accounts and balances

- A user can create an account with a valid opening balance.
- The displayed balance equals the opening balance plus all signed postings for that account.
- Editing a transaction immediately produces the corresponding recalculated balance.
- An account referenced by a transaction cannot be physically deleted through normal application behavior.
- Archiving an account does not alter balances or historical transactions.

### Categories

- A user can create income and expense categories.
- An income transaction cannot use an expense category, and vice versa.
- A category referenced by a transaction cannot be physically deleted through normal application behavior.
- Archiving a category does not alter historical transactions.

### Transactions and transfers

- Income increases exactly one account balance by the entered amount.
- Expense decreases exactly one account balance by the entered amount.
- Transfer decreases one account and increases another by the same amount in one atomic operation.
- A transfer cannot use the same account as both source and destination.
- A transfer contributes zero to monthly income and zero to monthly expense.
- History presents enough detail to identify type, amount, date, affected account(s), and category where applicable.

### Filters and dashboard

- Multiple selected filters combine predictably using AND semantics; multiple values within one filter, if supported, use OR semantics.
- Clearing filters restores the unfiltered history.
- Monthly totals are derived from stored transactions, not cached mutable balance fields.
- A month containing only transfers shows zero income and zero expense.

### Budgets

- A budget requires one active expense category, a valid month, and a positive whole-COP limit.
- Posted expenses matching that category and month count exactly once.
- Income, transfers, voided transactions, other months, and unbudgeted categories do not count toward budget totals.
- Archived categories remain visible on historical budgets but cannot be selected for new budgets.

### Persistence

- Data survives app restarts.
- Database initialization applies every pending migration exactly once in order.
- A migration failure does not leave a partially migrated schema.
- A failed restore leaves the entire pre-restore database unchanged, while a successful restore survives restart and refreshes every affected read model.

## 5. Explicitly out of MVP

Unless later promoted into scope:

- Cloud sync, accounts, and authentication.
- Shared budgets or multiple users.
- Bank integrations and automatic transaction import.
- Remote push notifications, credit-card due-date alerts, and automatic recurring transaction posting.
- Savings goals, debt schedules, and forecasting.
- Multiple currencies, conversion, and exchange rates.
- Receipt scanning or attachments.
- Web and iOS release commitments.
- Encrypted/password-protected backup, automatic/scheduled backup, cloud sync, merge import, and partial restore.
- Split transactions and transaction tagging.

## 6. Unresolved decisions

| Decision | Why it matters | Suggested MVP default |
|---|---|---|
| COP precision: whole pesos or centavos | Determines the stored minor-unit scale and input validation | Store integer minor units with a documented scale; choose the scale before migration 001 is frozen |
| Account types | Affects defaults, labels, and whether negative balances are normal | Start with a small optional enum: cash, bank, wallet, credit, other |
| Negative balances | Determines validation for expenses/transfers | Allow them; tracking should reflect reality rather than block entry |
| Transaction deletion policy | Affects auditability and user recovery | Allow hard deletion in MVP with confirmation, or adopt voiding if an immutable audit trail is desired |
| Transaction date semantics | Affects monthly totals and ordering | Store an effective local date/time plus a UTC creation timestamp |
| Required category | Affects data quality and quick entry | Require category for income/expense, with seeded “Other” categories |
| Opening balance changes after activity | Can rewrite historical meaning | Lock it after the first transaction or represent adjustments as transactions |
| Dashboard month navigation | Defines whether “monthly” means current month only | Support previous/next month, defaulting to current month |
| Filter persistence | Affects return behavior | Keep filters only for the current app session |
| Backup encryption | Plaintext manual backups are portable but sensitive | Keep version 1 explicit and add authenticated encryption only through a future format version |
