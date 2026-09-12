# Money Control — Design System

Which component to use for which job. The rule is **one component per role**: a
screen never re-creates something listed here. Visual direction (tonal borderless
cards, Manrope + JetBrains Mono, tokens only) is in [AGENTS.md](../AGENTS.md).

This document exists because a guide alone did not hold: `Button` already existed
and eighteen hand-rolled buttons still appeared, alongside twenty-five hand-rolled
headers with nine title sizes. The components below are the standard; this page
only says when to reach for each.

## Screen chrome

| Screen | Header | Where "create" lives |
|---|---|---|
| Primary tab — Home, Transactions, Accounts, Budgets | `PrimaryScreenHeader` | `onAdd` → header `+` (Accounts, Budgets). Home and Transactions have none: the tab bar's **Add** owns creating a transaction. |
| Any other screen | `ScreenHeader` | `action={{ kind: 'add' }}` → header `+` |

- `ScreenHeader` `leading="close"` for a screen presented modally, `leading="back"`
  for one pushed onto the stack. The icon tells the user whether leaving discards
  the context or returns to it.
- Headers render **outside** the ScrollView, so they stay fixed while content
  scrolls.
- Never a FAB, and never a create button pinned to the bottom. A FAB would put a
  second `+` on screens that already show the tab bar's Add; a pinned bar would
  stack on top of the tab bar. The header `+` is the one position that works on
  both kinds of screen.

## Creating things

| Situation | Component |
|---|---|
| The list already has items — "create another" | Header `+` (above) |
| The list is empty — "create your first" | `EmptyState` with `action` |

A labeled create button appears **only** in the empty state, where the user most
needs to be told what to do. Once items exist, it is the header `+`, on every screen.

## Buttons and actions

| Role | Examples | Component |
|---|---|---|
| Actions on one object | Refund / Edit / Void · Pay card / Statement / Edit card · Update value / Contribute / Withdraw | `ActionTileRow` |
| The command a form exists for | Save, Apply filters, Set ceiling | `Button` `size="lg"` `fullWidth` inside `FixedFooter` |
| A secondary command in a form or card | Retry, Remove ceiling, Load more | `Button` |
| A secondary command in a header | Clear all | `ScreenHeader` `action={{ kind: 'text' }}` |
| Choosing between a few views of one screen | Due / Rules / History · Expense / Income | `SegmentedControl` |
| Several actions on a row, shown on demand | Category actions | `ActionSheet` |
| Confirming a destructive action | Void, Archive, Delete | `dialog.confirm` with `tone: 'destructive'` |

`ActionTileRow` rules:

- At most **three** tiles per row; more wrap onto another row. At four, labels
  such as "Contribute" truncate on a phone.
- Labels are one or two words. The full phrase goes in `accessibilityLabel`.
- `tone: 'primary'` for the object's main action, `tone: 'destructive'` for void,
  archive or end. Everything else is the default tone.
- An unavailable action stays visible and `disabled`, with the reason passed in
  `hints`. A tile that disappears reads as a missing feature; a disabled tile with
  no reason reads as a bug.

`Button` variants: `primary` (one per view), `tonal`, `secondary`, `ghost`,
`destructive`. Heights are 32/38/46 by size, deliberately under 44 — `hitSlop`
restores the touch target.

## Typography

- Use a `typography` token. For emphasis use its **Strong** variant —
  `captionStrong`, `bodyStrong`, `labelStrong` — never `fontWeight` alone.
- `{ ...typography.caption, fontWeight: '700' }` keeps Manrope Medium and asks
  Android for a weight that file does not contain. Android draws faux-bold glyphs
  wider than the layout measured, and a label sized to its text wraps and clips its
  last word. That is how "+ Add subcategory" rendered as "+ Add".
- When no Strong token fits, pair the weight with its file:
  `fontFamily: fonts.sans.semibold, fontWeight: '600'`.
- **Enforced by lint** (`no-restricted-syntax` in `eslint.config.js`): an unpaired
  `fontWeight` next to a typography token, or a `fontWeight` with no font family at
  all, fails `npm run lint`.
- Screen titles come from the header components; do not size them per screen.

## States

| State | Component |
|---|---|
| Empty list | `EmptyState` — icon, title, one sentence, optional create action |
| First load of a list or card | `Skeleton` blocks in a container with `accessibilityRole="progressbar"` |
| Work inside a button | `Button` `busy` / `ActionTileSpec.busy` |
| Error | Message plus a `Button` labeled Retry |

## Money entry

All money fields keep the raw entry in state and display it through
`formatMoneyEntry`; sanitize with `sanitizeMoneyEntry`. See
`src/features/currency/money-entry.ts` for why the two must never be mixed.

## Exceptions

- `src/app/_layout.tsx` — the root error screen renders even when fonts failed to
  load, so it uses the system font and a plain `Pressable` on purpose.
- Rows that open a picker (for example `valueButton` in notification settings, or
  `FilterValueRow`) are list rows, not buttons.
