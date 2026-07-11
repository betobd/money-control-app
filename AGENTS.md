# Money Control project instructions

## Stack

- React Native
- Expo
- TypeScript
- Expo Router
- Local-first architecture
- SQLite for persistent application data

## General rules

- Keep TypeScript strict.
- Do not use `any` unless there is a documented technical reason.
- Do not suppress compiler or linter errors.
- Do not install dependencies unless they are necessary for the current phase.
- Do not implement functionality outside the requested scope.
- Prefer simple solutions over premature abstractions.
- Update relevant documentation when architectural decisions change.

## Architecture

- Organize business functionality by feature.
- Screens must not execute raw SQL.
- Database access must go through repositories.
- Business rules must not be embedded directly in UI components.
- Keep persistence models separate from presentation components.
- Every database schema change requires a migration.

## Financial rules

- Never use floating-point values for money.
- Store monetary values as integers in minor units.
- Transfers must not count as income or expense.
- Account balances must be reproducible from opening balances and transactions.
- Do not hard-delete accounts or categories that have related transactions.

## UI

- Support light and dark mode.
- Use design tokens instead of hardcoded colors and spacing.
- Include loading, empty and error states where applicable.
- Use accessible labels and suitable touch targets.
- Confirm destructive actions.

## Quality checks

Before completing an implementation task, run:

- TypeScript type checking
- linting
- relevant automated tests

Report any command that could not be run or any failing check.

## Navigation

- The primary bottom navigation must be identical across Home, Transactions, Accounts, and Budgets.
- The tab order is Home, Transactions, Add, Accounts, Budgets.
- Add opens a modal and is not a standard tab screen.
- Do not create screen-specific tab bar variants.


# Design reference

These files are visual references exported from Google Stitch.

## Important

- The screenshots define visual direction only.
- Do not copy generated web code directly into React Native.
- Recreate the UI using Expo, React Native, and Expo Router.
- Navigation must be consistent across all primary screens.
- The exact bottom navigation order is:
  1. Home
  2. Transactions
  3. Add
  4. Accounts
  5. Budgets
- Add opens a modal and is not a regular tab.
- Preserve dark mode and later create a matching light mode.
- Prefer native mobile patterns over web-style dropdowns.

## Visual decisions

- Dark navy background
- Blue as primary accent
- Green for income
- Coral for regular expenses
- Red only for destructive or over-budget states
- Rounded cards
- Compact financial dashboard
- Large COP amount formatting