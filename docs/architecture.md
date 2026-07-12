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
- Home, Transactions, and Budgets remain presentation-focused. Accounts is the first functional vertical slice, backed by SQLite through a repository and account service.
- Categories is a functional vertical slice with its own repository, service, focus-refresh hook, management modal, and form modal. Add Transaction reads active categories from this slice while transaction saving remains mocked.
- Expo SQLite and Drizzle ORM now provide the local database foundation. The root layout initializes the database and applies bundled migrations before rendering routes.
- Migration 001 defines accounts, categories, posted/voided transactions, transaction-split foundation, budgets, and recurring transaction templates. Repositories and business-feature integration do not exist yet.
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

When transaction services are implemented, they will construct the account effects defined in `financial-rules.md` atomically. Transaction-split creation and validation remain deferred in the current phase.

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
```

The visible navigation order is Home, Transactions, Add, Accounts, Budgets. Add is not registered as a tab route; it pushes the root modal, which fully covers the tab navigator. Future detail routes should remain outside the tab bar and may be added to the appropriate stack when their feature is implemented.

Every primary screen exposes the same More header action. The root `more` modal is intentionally minimal and links to the existing `categories` management modal; Add Transaction's contextual View All action links to that same route. Category icon identifiers are stable application strings mapped to platform symbols in the categories feature, with `other` as the documented fallback for unknown stored identifiers.

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

- No data leaves the device in MVP.
- Network access is unnecessary for core workflows.
- OS app sandboxing is the initial storage protection; database encryption is not currently confirmed.
- Backups, exports, screenshots, debug logs, Android backup policy, rooted-device threats, and at-rest encryption need an explicit privacy decision before release.

## 10. Unresolved decisions

- Repository API design over the selected Drizzle ORM persistence layer.
- State/query mechanism and invalidation strategy.
- Whether web/iOS remain buildable development targets or Android-only constraints may be introduced.
- Database encryption and Android backup behavior.
- Pagination approach and expected transaction volume.
- Transaction correction/audit policy.
- Money integer representation (`number` with bounds versus `bigint`).
- Date/time storage and reporting timezone policy.
- Testing libraries and CI environment.
