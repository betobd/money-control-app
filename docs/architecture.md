# Money Control — Architecture

## 1. Current project assessment

The repository is a lightly modified `create-expo-app` starter, not yet a Money Control implementation.

### Confirmed current state

- Expo SDK `~57.0.4`, React Native `0.86.0`, React `19.2.3`, and TypeScript `~6.0.3`.
- Expo Router `~57.0.4` is the entry point and typed routes are enabled.
- TypeScript strict mode and the `@/* -> src/*` path alias are enabled.
- React Compiler is enabled.
- A root Expo Router stack contains a shared tab navigator and a full-screen Add Transaction modal.
- The shared custom tab bar serves Home, Transactions, Accounts, and Budgets, with a centered Add action that opens the modal instead of acting as a tab destination.
- Accounts, Categories, Transactions, and Budgets are functional SQLite-backed vertical slices. Home consumes their derived read models, including the current Bogotá-month budget summary.
- Categories is a functional vertical slice with its own repository, service, focus-refresh hook, management modal, and form modal. Add Transaction reads active categories from this slice.
- Expense, Income, and Transfer entry are functional through the transaction repository/service slice. Add Transaction validates active references and writes one posted row per transaction; Transactions and Home use focus-refreshed SQLite read models. Transfers reuse the account selector for distinct active source and destination accounts and never create paired income/expense rows. Transaction rows open a root details modal where posted records can be edited or irreversibly transitioned to `voided`; neither action changes transaction identity or hard-deletes history.
- Transaction history now searches and filters persisted rows through a typed repository query, returns joined display labels, and incrementally loads stable 40-row cursor pages ordered by financial date, creation time, and ID. Screen-local query state survives the existing details modal and reloads page one through financial-data invalidation after create, edit, or void.
- Recurring Transactions is a functional vertical slice under More. Its service generates bounded, idempotent pending occurrences from reusable rules, while confirmation delegates validation and transaction construction to `TransactionService`. The recurring repository atomically persists the normal transaction and occurrence link, then the existing financial-data invalidation refreshes Accounts, Home, Budgets, and Transactions.
- Reports is a functional SQLite-backed vertical slice under More at `/reports`. A dedicated reporting repository performs bounded aggregate queries, while `ReportService` validates Bogotá-local periods, fills continuous buckets, calculates basis-point percentages and previous-period comparisons, and builds net-worth points from opening balances plus cumulative posted history. It reuses focus/event financial-data invalidation without changing transaction persistence.
- Backup & Restore is a functional local-first vertical slice under More at `/backup`. It exports a versioned logical JSON snapshot through Android's native share UI and imports through the native document picker. Restore validates the complete graph and checksum before replacing all application-owned rows in one exclusive SQLite transaction; migration metadata and device secrets are excluded. See [backup-and-restore.md](backup-and-restore.md).
- Local App Lock is an optional SecureStore-backed vertical slice under More at `/security`. A root provider resolves lock configuration before SQLite initialization or protected-route mounting, then gates the financial stack behind a six-digit, native PBKDF2-verified PIN with optional strong device biometrics, AppState delays, local retry throttling, and Android screen-capture protection. The native KDF requires an Android development or production build and is intentionally unavailable in Expo Go. It does not encrypt SQLite or plaintext backups. See [security.md](security.md).
- Expo SQLite and Drizzle ORM now provide the local database foundation. The root layout initializes the database and applies bundled migrations before rendering routes.
- Migration 0000 defines accounts, categories, posted/voided transactions, transaction-split foundation, the original one-category budget foundation, and recurring transaction templates. Migration 0004 preserves the direct category relationship while renaming the budget amount to `limit_amount` and removing the redundant COP currency column. Migration 0005 upgrades recurring templates with schedule lifecycle fields and adds snapshot-based recurring occurrences.
- The app config declares Android, iOS, and static web settings, although the stated product target is Android.
- The worktree already contains user changes and many untracked starter files; implementation work must preserve them.

Expo SDK 57 documentation identifies the installed `expo-sqlite` `~57.0.0` as the matching package and states that its database persists across restarts. It also documents parameter binding, prepared statements, transactions, and provider-based initialization. See the [versioned Expo SQLite documentation](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/).

## 2. Architectural goals

- Financial correctness is isolated from UI concerns and straightforward to test.
- Local storage is the source of truth; screens query persisted data rather than maintaining a competing in-memory ledger.
- Every multi-row financial change is atomic.
- Balances and dashboard totals are reproducible queries.
- Schema upgrades are explicit, ordered, and recoverable.
- Features are organized by domain capability without premature infrastructure.
- Platform code remains compatible with Expo SDK 57 and Android-first requirements.

## 3. Proposed architecture (assumption)

```text
Expo Router screens/layouts
        │
Presentation components + screen hooks
        │
Application use cases / services
        │
Domain rules and money/date value objects
        │
Repository interfaces
        │
SQLite repository implementations
        │
expo-sqlite database + ordered migrations
```

Dependencies point downward. UI code must not assemble postings or execute SQL. Database rows must not leak directly into screens; repositories map them to domain/read models.

### Suggested source organization

```text
src/
  app/                    # Expo Router route files and layouts
  features/
    accounts/             # screens/components/hooks for account workflows
    categories/
    transactions/
    dashboard/
  domain/
    money/                # integer money parsing, validation, formatting
    ledger/               # transaction/posting invariants and calculations
  application/            # use cases coordinating domain + repositories
  data/
    database/             # open/configure DB, migration runner, migrations
    repositories/         # SQLite-backed repositories
    queries/              # read models for history, balances, dashboard
  shared/                 # genuinely cross-feature UI/utilities
```

Route files should remain thin composition boundaries. Feature UI can depend on application interfaces and read models, not SQLite APIs.

## 4. Persistence and migrations

### Selected engine

Use SQLite through SDK-57-compatible `expo-sqlite`, with Drizzle ORM's Expo SQLite driver and Drizzle Kit migrations. A relational database fits foreign keys, atomic transfer writes, history filters, aggregate queries, and controlled migrations better than key-value storage.

### Connection initialization

On database startup:

1. Open one named application database.
2. Enable foreign keys for the connection.
3. Configure an appropriate journal mode (WAL is the documented Expo example; verify Android behavior during implementation).
4. Read the current schema version.
5. Apply pending migrations sequentially inside protected transactions.
6. Run integrity/sanity checks.
7. Expose repositories only after initialization succeeds.

Use bound parameters or prepared statements for user data. Never interpolate user input into SQL.

### Migration policy

- Each schema change is a new immutable, ordered migration checked into source control.
- Never edit a migration that has shipped; add a corrective migration.
- Do not rely on runtime `CREATE TABLE IF NOT EXISTS` as a substitute for versioned migrations.
- Each migration has an integer version, descriptive name, forward operation, and automated upgrade test.
- Record the successful version only after the migration completes.
- Migration failure blocks normal application writes and surfaces a recoverable error; it must not silently reset user data.
- Destructive changes use create-copy-validate-swap patterns and are tested against a previous-version fixture.

## 5. Write and read paths

### Commands

Application use cases validate input and execute a single repository transaction:

Application services own history-dependent and cross-table rules: opening balances become immutable after posted activity, category type must match income/expense type, and persisted transactions are voided rather than deleted. SQLite constraints remain defense in depth for row-local invariants.

- `createAccount`, `updateAccount`, `archiveAccount`, `restoreAccount`
- `createCategory`, `updateCategory`, `archiveCategory`, `restoreCategory`
- `recordIncome`, `recordExpense`, `recordTransfer`
- `editTransaction`, and the chosen correction/deletion operation

The transaction service constructs the account effects defined in `financial-rules.md`. A transfer is one atomic SQLite row whose source and destination effects are derived by balance queries. Transaction-split creation and validation remain deferred in the current phase.

### Queries

Dedicated read queries return screen-oriented models:

- Account list with derived balances.
- Paginated/limited transaction history with account/category labels.
- Filtered history using parameterized predicates.
- Monthly income, expense, net cash flow, and expense-by-category.

Avoid persisted mutable balance columns in MVP. Add indexes for actual query patterns after measuring, starting with transaction date/status, account effect, transaction type, and category references.

### UI refresh

After a successful command, invalidate or refresh affected read queries. Any client-side cache is an optimization, not a source of financial truth. Choose a state/query mechanism only after validating whether simple focused hooks are sufficient.

## 6. Navigation

The application uses Expo Router's JavaScript tabs with one shared custom tab-bar component. This supports the required elevated Add action and identical selected-state, spacing, height, accessibility, and safe-area behavior across every primary screen without depending on the unstable native-tabs API.

The current shell route shape is:

```text
_layout                         # Root stack
(tabs)/_layout                  # Shared tab navigator and tab bar
(tabs)/index                    # Home
(tabs)/transactions
(tabs)/accounts
(tabs)/budgets
add-transaction                 # Root full-screen modal
transactions/[id]              # Root full-screen details/edit modal
budget-form                    # Root full-screen create/edit Budget modal
```

The visible navigation order is Home, Transactions, Add, Accounts, Budgets. Add is not registered as a tab route; it pushes the root modal, which fully covers the tab navigator. Future detail routes should remain outside the tab bar and may be added to the appropriate stack when their feature is implemented.

Every primary screen exposes the same More header action. The root `more` modal links to Categories and Recurring Transactions; recurring management remains outside the five primary tabs. Add Transaction's contextual View All action links to the same Categories route. Category icon identifiers are stable application strings mapped to platform symbols in the categories feature, with `other` as the documented fallback for unknown stored identifiers.

Reports also remains outside the five primary tabs. More pushes the dedicated `/reports` route; the shared tab navigator and Add modal behavior are unchanged. The report screen uses existing React Native primitives and theme tokens, with dependency-free accessible bars and a view-based net-worth line plot. Reporting semantics and MVP limits are documented in [reports.md](reports.md).

Backup & Restore likewise remains outside the five primary tabs. More pushes `/backup`; export and import use Android system surfaces, while the route itself stays a thin feature composition boundary.

Security also remains outside the five primary tabs. More pushes `/security`. Its route is a thin feature composition boundary; SecureStore, PBKDF2, biometric result normalization, lockout rules, AppState timing, and privacy protection stay in the security feature rather than UI components. The App Lock gate wraps database initialization and the complete root stack so protected content is not mounted while lock state is loading or locked.

### Budgets slice

The Budgets slice keeps route files thin and derives attribution automatically from `budget.category_id`, `transaction.category_id`, and the transaction date. Transactions never persist or select a budget ID. The direct `budgets.category_id` foreign key and `UNIQUE(category_id, month)` constraint make one expense category correspond to at most one budget in a month, so a qualifying transaction cannot overlap multiple budgets under the MVP model.

`BudgetService` validates a positive safe-integer limit, an active expense category for new records, a valid month, and category/month uniqueness before persistence. Archived categories remain referenced by historical budgets but are unavailable for new selection. `SQLiteBudgetRepository` aggregates only posted expenses whose category matches the budget and whose `transaction_date` falls inside the budget month. Budgets and Home consume the same calculated monthly summary and reload through the shared financial-data invalidation hook after successful Budget or Transaction writes.

Optional visual groups such as Leisure or Household may later present several independent category budgets together. A group is presentation metadata only: it must not own transactions, replace category/date attribution, or aggregate a transaction more than once. Cross-cutting cases such as trips, weddings, renovations, and events may later use tags or projects rather than weakening the one-category budget invariant; neither groups nor tags/projects are implemented now.

## 7. Error handling and observability

- Domain validation errors are typed and shown as actionable form messages.
- Persistence failures preserve the user's input and offer retry where safe.
- Migration failures show a blocking recovery screen and must not trigger automatic data deletion.
- Development logging may include operation names and schema versions, but never full notes or other user-entered financial content by default.
- Unexpected errors include context without monetary/user data.

## 8. Verification strategy

- Unit tests for money parsing/formatting, posting construction, date boundaries, and financial invariants.
- Repository integration tests against SQLite for CRUD, foreign keys, atomic rollbacks, filters, aggregates, and migration upgrades.
- Component tests for forms and filter behavior.
- Android end-to-end smoke tests for the critical path: create accounts/categories, enter each transaction type, restart, and verify balances/dashboard.
- Property-style tests for conservation: arbitrary transfers must leave total balance unchanged.
- A reconciliation test that compares query balances with a from-scratch ledger fold.

## 9. Security and privacy assumptions

- No data leaves the device automatically. A backup leaves the app only after the user explicitly chooses a destination through the Android share UI.
- Network access is unnecessary for core workflows.
- OS app sandboxing is the initial storage protection; database encryption is not currently confirmed.
- Manual backups are plaintext and carry a prominent privacy warning. Password protection, authenticated encryption, Android automatic-backup policy, rooted-device threats, screenshots, and at-rest database encryption remain release decisions.
- Optional App Lock protects casual UI access with a local PIN and strong device biometrics. It uses Android Keystore-backed SecureStore records and `FLAG_SECURE`, but does not protect against rooted/instrumented devices, external cameras, every overlay/capture technique, plaintext SQLite extraction after device compromise, or plaintext exported backups.

## 10. Unresolved decisions

- Repository API design over the selected Drizzle ORM persistence layer.
- State/query mechanism and invalidation strategy.
- Whether web/iOS remain buildable development targets or Android-only constraints may be introduced.
- Database encryption and Android backup behavior.
- Expected production transaction volume and the threshold for adding search-specific indexing.
- Transaction correction/audit policy.
- Money integer representation (`number` with bounds versus `bigint`).
- Date/time storage and reporting timezone policy.
- Testing libraries and CI environment.
