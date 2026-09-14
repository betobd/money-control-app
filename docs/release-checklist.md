# Money Control — Release Checklist (v1)

## Automated gates

Run and confirm all pass:

- `npx tsc --noEmit` — type checking
- `npm run lint` — eslint
- Unit + integration tests (Node): `node --import tsx --test tests/*.test.mjs`
- SQLite/migration tests (Python): run each `tests/*_database_test.py`
- `npx expo install --check` — dependency alignment for the SDK
- Android production export: `npx expo export --platform android`
- `git diff --check` — no whitespace/conflict markers

Per-feature test scripts are defined in `package.json` (`test:accounts`, `test:categories`, `test:transactions`, `test:refunds`, `test:budgets`, `test:reports`, `test:recurring`, `test:credit-cards`, `test:notifications`, `test:backup`, `test:data-export`, `test:security`, `test:currency`, `test:exchange-rates`, `test:multi-currency-migration`, `test:investments`, `test:onboarding`). `test:categories` also runs `scripts/validate-category-icons.mjs`.

## Financial correctness (must hold)

- Refunds never count as income; transfers never count as income or expense; card payments never count as expenses.
- Voided transactions never affect balances, reports, or budgets.
- No fake statement data is shown; no fake zero-value financial data during loading.
- Money is stored as integer minor units using each currency's registry factor (COP 1, USD 100); no NaN/Infinity/float in persisted or displayed money or exchange rates (no SQLite REAL).
- Foreign-currency income/expense/refund store a base-currency snapshot + rate; Reports/Budgets/Home use the snapshot and never change when the rate refreshes. Estimated net worth converts foreign balances at the latest saved rate (or is marked incomplete when no rate exists).
- No screen or message names a fixed currency: labels use the install's base currency.
- Existing data is numerically unchanged by every migration (0009, 0014, 0016); legacy backups migrate to COP, which is what they always meant.
- Home totals match Reports and Data Export for the same period.
- Positive card balances display as **Credit balance**, not **Current debt**.
- Restore over an existing database that contains a linked refund succeeds.
- A failed restore leaves the current database unchanged.

## Data integrity

- Foreign keys enabled; `PRAGMA foreign_key_check` and `integrity_check` clean after migration and after restore.
- App Lock secrets and device notification identifiers are excluded from backup and not restored; notifications are rebuilt after restore.
- Exported CSV is plaintext, formula-injection-protected, and not restorable.

## Manual Android smoke (see AGENTS.md scenario list)

Fresh install → welcome flow suggests the device currency → pick a base currency (and, separately, restore a backup from the welcome flow) → upgrade install with existing data skips the welcome flow → create accounts/categories → expense/income/transfer → edit/void → budgets → recurring generate/post → reports → credit card + statement + min/remaining payment → partial/full refund → refund a card purchase → verify Home/Accounts/Transactions/Budgets/Reports/card details → backup → CSV export → App Lock enable → background/resume → restore → notification reconciliation → light + dark theme → small-screen layout → keyboard → screen-reader labels → restart persistence → no stale values after mutations.

## Informational (report, do not auto-apply)

- `npm outdated` and `npm audit` — review; do not blindly apply breaking upgrades.
- Confirm no debug routes, mock data reachable in production, hard-coded dates/IDs, or sensitive data in logs.
