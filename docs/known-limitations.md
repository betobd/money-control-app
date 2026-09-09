# Money Control — Known Limitations (v1)

Money Control v1 is a personal, local-first Android finance app. These limitations are intentional and documented so behavior is not mistaken for a defect.

## Product scope

- Personal, single-device, local-first. No cloud sync, no multi-device, no shared accounts.
- 160 currencies, with a per-install base currency chosen at setup. The base is fixed once a transaction or budget exists, because restating stored snapshots would need historical rates the app does not keep. COP is stored in whole pesos, not centavos. See [currency-and-rates.md](currency-and-rates.md).
- Currency limitations: budgets are in the base currency only; no recurring cross-currency transfers; no FX gain/loss or tax accounting; the historical net-worth timeline values foreign balances at the current saved rate (Option A), not historical daily FX. Reference rates are from Frankfurter and may differ from your bank's rate. Number grouping follows the currency registry, not the reader's locale.
- No bank synchronization, no automatic transaction detection, no automatic statement import.
- No installment modeling, no interest calculation, no issuer minimum-payment formula.
- No chargebacks/disputes, no split transactions, no projects, no tags.
- No CSV import. Exported CSV files are human-readable plaintext and are **not** restorable — restore accepts only the versioned JSON backup.

## Credit cards

- Each purchase is recorded as one full expense; installments are not modeled.
- The overall monthly ceiling is a single base-currency figure per month: no per-category ceiling, no per-currency ceiling, and no income-side target. It carries forward rather than recurring through a rule, so a month never has a ceiling row until one is set there.
- A card payment is one posted transfer; it never counts as income, expense, or budget spending.
- Minimum payment and statement balance are copied from the bank; the app never calculates them.
- **Statement payment attribution is a date-based approximation, not issuer-level allocation.** A posted transfer into the card after the later of the statement's period end and closing date is counted against that statement. Consequently a single payment can reduce more than one older unpaid statement's displayed "remaining"; the bank remains the authoritative source. This is surfaced with a "Payment" descriptor in the card's recent activity and documented in [credit-cards.md](credit-cards.md).
- Merchant refunds reduce current debt and utilization but never count as statement payments.
- Positive (overpaid) card balances are supported and shown as a **Credit balance**, distinct from **Current debt** and **No debt**.

## Performance (personal-scale)

- Credit-card statement views load qualifying payments per statement. For a personal number of cards and statements this is acceptable; it is not optimized for very large statement histories. Deferred for a future pass — see [deferred v2](#deferred-recommendations-v2).
- The signed account-effect balance formula is expressed in three places (account balance SQL, report net-worth SQL, and the transfer-validation projection in `TransactionService`). They currently agree and are covered by tests; consolidating them into one canonical definition is a v2 refactor to remove divergence risk.

## Notifications

- No exact-alarm permission is requested, so OEM Doze/battery optimizations may delay reminders.
- Reminders never create or confirm financial transactions and never roll back a persisted write.

## Migrations / tooling

- Released migrations are immutable and hand-authored (they include triggers/guards Drizzle Kit does not model). `drizzle-kit generate` is **not** the source of truth and must not be used to author new migrations; add new ordered `.sql` migrations by hand following the existing pattern. The `meta/` snapshots are only complete for the earliest migrations; do not rely on `drizzle-kit generate` diffs.

## Investments

Investments v1 tracks value by total balance per account/product; see
[investments.md](investments.md).

- No individual holdings, securities, symbols, quantities, prices, buys/sells,
  dividends/fees per holding, cost basis, realized gains from sales, IRR/TWR/APY,
  taxes, or market-data feeds (deferred to v2).
- Contributions/withdrawals are transfers; a valuation update changes net worth
  but is never Income/Expense. Current value comes from the latest manual
  valuation; with none it equals net contributions.
- `basis_minor` is snapshotted when a valuation is recorded; backdating a
  contribution after a valuation shifts the estimated gain — re-record the
  valuation to correct it.
- The net-worth timeline overlays the valuation in effect at each point
  (estimated); no historical daily FX and no interpolation between valuations.
  Consolidated foreign balances use the current saved rates (Option A); a currency with no
  rate is excluded and named in the incomplete message.
- No CDT-maturity or stale-valuation reminders in v1. Withdrawing realized gains
  requires recording the gain as Income first (a transfer withdrawal is limited to
  net contributions by the funds check).

## Deferred recommendations (v2)

- Consolidate the signed account-effect balance formula into a single shared definition.
- Batch/partition credit-card statement payment attribution to remove the per-statement query.
- Bound each older statement's attribution window to the next statement's cutoff for more accurate "remaining".
- Adjustment-transaction workflow for corrections after opening-balance immutability.
- Optional `voidedAt`/void-reason audit metadata.
- Associate inline form-field errors with their inputs via accessibility for every form (partially done).
