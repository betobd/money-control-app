# Money Control — Implementation Plan

## 1. Planning principles

- This plan does not authorize dependency installation or feature implementation yet.
- Resolve decisions that affect persisted meaning before creating migration 001.
- Build vertical, testable slices while keeping financial rules below the UI layer.
- Treat migrations and ledger tests as release-critical, not cleanup work.
- Re-check the exact [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/) before implementation because the repository's `AGENTS.md` requires version-specific guidance.

## 2. Confirmed starting point

- The project is an Expo SDK 57 TypeScript starter with Expo Router.
- Existing screens and navigation are sample content.
- No application persistence or financial domain code exists.
- No persistence dependency is currently declared.
- Application code must remain unchanged during the present documentation task.
- Dependencies must not be installed during the present documentation task.

## 3. Decision gate (before implementation)

Obtain explicit answers or accept documented defaults for:

1. COP storage scale (whole pesos or centavos).
2. Money runtime representation and maximum supported amount.
3. Transaction correction/deletion policy.
4. Opening-balance editing and effective-date policy.
5. Effective time and timezone/month-boundary semantics.
6. Whether income/expense categories are mandatory.
7. Negative-balance behavior.
8. Account types and archived-account dashboard inclusion.
9. Android backup and database-encryption expectations.
10. Whether iOS/web compatibility is a requirement or only Android matters.

Deliverable: an approved decision record updating the “unresolved decisions” sections in the specification documents.

## 4. Phased implementation

### Phase 0 — Baseline and technical decisions

- Preserve and review the existing dirty worktree before edits.
- Confirm Expo SDK 57-compatible APIs and packages from versioned official docs.
- Choose persistence access style, testing tools, navigation primitives, and state/query strategy.
- Define quality commands for type checking, linting, unit tests, and Android smoke testing.
- Establish accessibility and localization conventions for COP display.

Exit criteria:

- Architecture decisions are documented.
- Required dependencies are approved before installation.
- Baseline project commands and current warnings are recorded.

### Phase 1 — Financial domain foundation

- Implement integer money parsing, formatting, bounds, and value semantics.
- Implement transaction/posting constructors for income, expense, and transfer.
- Implement ledger invariants and typed validation errors.
- Implement reporting interval/date utilities after timezone decisions are resolved.
- Add unit/property tests, including transfer conservation and no-float boundary cases.

Exit criteria:

- No domain API accepts floating-point monetary values.
- Tests prove posting shapes, signs, bounds, and transfer net-zero behavior.

### Phase 2 — Local database and migrations

- Add the approved SDK-compatible SQLite dependency only at this phase.
- Implement database initialization, foreign keys, migration runner, and failure handling.
- Create migration 001 for accounts, categories, transactions, postings, constraints, and indexes.
- Implement repositories and atomic transaction writes.
- Add migration upgrade fixtures and repository integration tests.

Exit criteria:

- Fresh initialization and upgrade from each fixture succeed.
- Failed transfers and failed migrations roll back completely.
- Foreign keys and archive/delete protections are verified.
- Recomputed balances match ledger folds.

### Phase 3 — Accounts and categories slice

- Replace relevant starter routes with account/category workflows.
- Implement list, create, edit, archive, and restore behavior.
- Show opening/current balances using derived queries.
- Exclude archived choices from new-entry forms while retaining historical labels.

Exit criteria:

- Account/category acceptance criteria pass on Android.
- Referenced records cannot be physically deleted.
- Empty, loading, validation, and persistence-error states are usable.

### Phase 4 — Transactions slice

- Implement income, expense, and transfer entry forms.
- Implement edit and the approved correction/deletion behavior.
- Validate category kind, account state, distinct transfer accounts, amount, and date.
- Keep every multi-row operation atomic.

Exit criteria:

- All three transaction types survive restart.
- Account balances update correctly after create/edit/correction.
- Transfers never partially save and never affect income/expense totals.

### Phase 5 — History and filters

- Implement stable, newest-first transaction history.
- Add date range, type, account, and category filters.
- Define AND/OR filter semantics in UI and tests.
- Add pagination or incremental loading if data-volume tests justify it.

Exit criteria:

- Filter combinations return correct deterministic results.
- Archived account/category labels remain visible.
- Empty and cleared-filter states behave as specified.

### Phase 6 — Monthly dashboard

- Implement selected-month income, expense, and net cash flow.
- Implement account-balance summary and basic expense-by-category view.
- Ensure all totals are database-derived and exclude transfers.
- Add month-boundary, archived-record, and transfer-only test fixtures.

Exit criteria:

- Dashboard totals reconcile with history for the same interval.
- A transfer-only month reports zero income and expense.
- Balance totals follow the chosen archived-account policy.

### Phase 7 — Release hardening

- Run accessibility review, Android layout checks, and locale/COP formatting checks.
- Test process death, restart, migration interruption, large safe amounts, and corrupted/invalid data handling.
- Review privacy-sensitive logs, Android backup policy, and release configuration.
- Remove remaining starter/tutorial assets and copy only after app flows replace them.
- Produce a manual reconciliation checklist and release smoke test.

Exit criteria:

- Critical path passes on the supported Android versions/devices.
- No known balance-reconciliation or migration defects remain.
- Data-loss limitations (especially lack of backup/export) are disclosed.

### Implemented reporting vertical slice

Reports is implemented as a dedicated feature repository/service/UI slice reachable from More at `/reports`. It covers period summary, cash flow over time, category expenses, net-worth evolution, and previous-period comparison without adding a chart dependency or schema migration. See [reports.md](reports.md) for calculations, grouping, performance expectations, and known limitations.

## 5. Test matrix

| Area | Essential cases |
|---|---|
| Money | zero/rejected amount, maximum bound, separators, excessive decimals, malformed input, format/parse round trip |
| Income | positive posting, correct category kind, archived references rejected |
| Expense | negative posting, resulting negative balance policy, monthly magnitude |
| Transfer | distinct accounts, equal/opposite postings, rollback, edits, net-zero total, excluded from dashboard |
| Balance | opening-only, mixed transactions, archived account, edit/delete/correction, full recomputation |
| History | deterministic ties, all filters, combined filters, archived labels, empty results |
| Month | first/last instant, timezone change policy, leap day, transfer-only month |
| Migrations | fresh install, each prior version, interrupted/failing migration, constraints/indexes present |
| Persistence | app restart, process death during write, atomicity |

## 6. Dependencies and sequencing

```text
Decision gate
  ├─> Money/date domain ───────────────┐
  └─> Persistence choice ─> migrations ├─> accounts/categories
                                      └─> transactions ─> history/filters
                                                       └─> dashboard
All phases ─────────────────────────────────────────────> release hardening
```

Accounts/categories can begin only after the initial schema is stable. History and dashboard depend on validated transaction writes and query semantics. UI prototyping may occur earlier with static fixtures, but it must not define competing financial logic.

## 7. Assumptions

- One developer-sized vertical slice can be completed and verified before starting the next.
- SQLite is the intended local persistence engine, subject to approval at the decision gate.
- Android is the only release blocker for MVP; other platforms are best-effort until confirmed.
- No data migration from an earlier Money Control app is required.

## 8. Unresolved planning inputs

- Target Android API/device matrix.
- Release date or milestone constraints.
- Required automated CI and end-to-end environment.
- UX/design source of truth and accessibility target.
- Expected transaction volume for performance testing.
- Whether seed data/default categories ship in migration 001 or application bootstrap.
- Whether backup/export must move into MVP because local-only data may be lost on uninstall or device failure.
