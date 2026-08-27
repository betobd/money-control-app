# Money Control — Data Export v1

## Scope and distinction from backup

Data Export is a read-only, local-first feature under **More → Data Export** at `/data-export`. It creates human-readable CSV files for spreadsheets, analysis, accounting review, and deliberate sharing. It does not add a bottom-navigation item and does not change the Home, Transactions, Add, Accounts, Budgets order.

CSV is not a restoration format. **Backup & Restore** remains the only complete logical recovery feature: its versioned JSON preserves IDs, relationships, archived state, recurring occurrence links, statement history, and every portable collection required to replace app state. CSV flattens selected read models for people and spreadsheet software and cannot be selected or restored through Backup & Restore.

V1 exports one file per action:

- Transactions
- Accounts
- Budgets for one selected month
- Recurring transaction rules
- Credit-card statements
- Report summary for one selected report period

CSV import, XLSX/Excel export, PDF reports, ZIP files, cloud upload, scheduled/email delivery, remote synchronization, and accounting integrations are outside this slice.

## Native file workflow

The service validates the selection, counts rows, creates a preview, queries persisted SQLite data, serializes chunks, and writes an app-owned temporary file under the Expo cache directory. `expo-sharing` then opens Android's native share surface with MIME type `text/csv`. A compatible Files or cloud-provider target may offer a save destination; Money Control itself uploads nothing and requests no broad storage permission.

Expo Sharing 57 returns `Promise<void>` and does not report the chosen target, final destination, or whether the user ultimately saved/shared versus canceled after the share surface opened. Consequently, the app distinguishes file-generation errors from a successfully opened/closed native interface, treats closing/canceling that interface as neutral, and never claims “Saved to Drive” or another destination. Android/provider duplicate-file behavior determines the final external name. The same temporary cache name may be overwritten safely because it is not a user-saved file.

The temporary file is deleted after the native interface returns. Files left by process interruption are removed on a best-effort basis when older than 24 hours. Cleanup is restricted to Money Control's export cache and never deletes external user-saved files.

The existing Backup adapter is not shared directly because it is JSON-specific and writes one complete string. Data Export uses a separate adapter with the same cache/share/privacy boundary and incremental `FileHandle.writeBytes` calls.

## CSV contract

- Encoding: UTF-8 with one BOM (`U+FEFF`) at the beginning. The BOM is intentional for reliable Excel detection of Spanish accents and other Unicode text.
- Delimiter: comma.
- Record ending: CRLF, consistently including the final record.
- Null and empty string: empty field.
- Fields containing comma, double quote, carriage return, or line feed are double-quoted.
- A double quote inside a quoted field is doubled.
- Embedded note line breaks remain inside a quoted field.
- Headers and column order are deterministic.
- No prose or metadata lines precede the header.

The serializer emits approximately 64 KiB text chunks. It never assembles the complete transaction CSV in React state or one repeatedly concatenated application string.

### Spreadsheet formula injection

Formula protection is applied only to exported user-authored text columns: account, category, and card names; transaction and recurring notes; and related readable-name columns. If one of those strings begins with `=`, `+`, `-`, `@`, tab, or carriage return, the exported representation receives a leading apostrophe. Stored SQLite values are unchanged.

Numeric columns are typed as numbers before serialization, so legitimate negative account balances and budget remaining values are not apostrophe-prefixed. IDs, controlled enums, and application-generated dates are not treated as user text.

## Multi-currency columns

As of Multi-Currency v1, exports include native and COP values. The transactions CSV
adds `currency_code`, `amount_minor` (native, replacing `amount_cop`),
`base_currency_amount_cop` (the COP snapshot), `exchange_rate`, `exchange_rate_date`,
`exchange_rate_source`, `destination_amount_minor`, and `destination_currency_code`.
The accounts CSV adds `currency_code`, `estimated_base_currency_balance_cop`, and
`valuation_rate` / `valuation_rate_date` / `valuation_rate_source`, with native
`opening_balance_minor` / `current_balance_minor` columns. Report exports remain COP
using saved transaction snapshots. See [currency-and-rates.md](currency-and-rates.md).

## Money and date conventions

Money columns contain raw whole COP integers without thousands separators, decimal fractions, currency symbols, or parentheses. For example, `1250000` means COP 1,250,000.

Account opening/current balances are signed. In particular, credit-card debt is negative in `opening_balance_cop` and `current_balance_cop`; a positive card balance is credit. `current_debt_cop` is the non-negative owed magnitude, and `available_credit_cop` may be negative when over limit. Transactions continue to export positive magnitudes because transaction type supplies direction.

Financial dates remain Bogotá-local calendar strings and are never converted through UTC:

- transaction, statement, and recurring dates: `YYYY-MM-DD`
- budget month: `YYYY-MM`
- `created_at` / `updated_at`: stored UTC ISO-8601 timestamps

Filenames use the Bogotá-local date or selected financial period and contain lowercase safe characters with no spaces.

## Transaction export

The default is Current month. Data Export reuses the existing independent transaction-filter model and UI:

- Current month, Previous month, Last 30 days, inclusive custom range, or All time
- Expense, Income, Transfer, Refund, or All
- Posted, Voided, or All
- one historically referenced source/destination account or All
- one historically referenced category or All

Predicates combine with `AND`; account matching uses source **or** destination. Transfers never match a category filter. Refunds match their original expense category. Export filter state is local to Data Export and never changes the Transactions screen. Rows are chronological ascending by `transaction_date`, then `created_at`, then `transaction_id`. Archived account/category names remain readable. Notes are off by default and may be explicitly enabled.

Columns:

1. `transaction_id`
2. `transaction_date`
3. `type`
4. `status`
5. `amount_cop`
6. `category_id`
7. `category_name`
8. `original_transaction_id`
9. `original_transaction_date`
10. `original_transaction_amount_cop`
11. `original_transaction_note`
12. `source_account_id`
13. `source_account_name`
14. `destination_account_id`
15. `destination_account_name`
16. `note`
17. `recurring_occurrence_id`
18. `created_at`
19. `updated_at`

`subcategory_id` and `subcategory_name` follow `category_name`. A refund inherits
both levels from the expense it refunds. Transfer category fields are blank and both accounts are populated. Expense/income destination fields are blank. Posted and voided history are both included unless status is filtered. When no rows match, no headers-only file is created.

Filename: `money-control-transactions-YYYY-MM-DD-to-YYYY-MM-DD.csv`.

## Account export

All active and archived accounts use the existing derived-balance query and credit-card utilization calculation.

Columns:

1. `account_id`
2. `name`
3. `type`
4. `status`
5. `opening_balance_cop`
6. `current_balance_cop`
7. `credit_limit_cop`
8. `current_debt_cop`
9. `available_credit_cop`
10. `utilization_percentage`
11. `statement_closing_day`
12. `payment_due_day`
13. `created_at`
14. `updated_at`

Card-only columns are blank for non-card accounts. Filename: `money-control-accounts-YYYY-MM-DD.csv`.

## Budget export

The selected month uses `BudgetService.listMonth`, so transfers, income, voided expenses, other months, and unbudgeted categories remain excluded exactly as in Budgets. Archived referenced categories remain readable. Percentage is the real calculated value and may exceed 100; only UI progress width is clamped.

Columns:

1. `budget_id`
2. `month`
3. `category_id`
4. `category_name`
5. `limit_amount_cop`
6. `spent_amount_cop`
7. `remaining_amount_cop`
8. `percentage_used`
9. `status`
10. `created_at`
11. `updated_at`

Filename: `money-control-budgets-YYYY-MM.csv`.

## Recurring-rule export

This action exports templates only and never generates occurrences or financial transactions. Notes are off by default. Active, paused, and ended rules remain distinguishable through `active` and `lifecycle_status`.

Columns:

1. `recurring_rule_id`
2. `type`
3. `amount_cop`
4. `source_account_id`
5. `source_account_name`
6. `destination_account_id`
7. `destination_account_name`
8. `category_id`
9. `category_name`
10. `frequency`
11. `interval`
12. `start_date`
13. `next_occurrence_date`
14. `end_date`
15. `active`
16. `lifecycle_status`
17. `note`
18. `created_at`
19. `updated_at`

`subcategory_id` and `subcategory_name` follow `category_name` here too.
Occurrences are not mixed into this table and receive no second file in v1. Filename: `money-control-recurring-rules-YYYY-MM-DD.csv`.

## Credit-card statement export

Statements and candidate payments are fetched in two batched SQLite queries. Each row uses the existing statement attribution calculation; Money Control does not recalculate the bank's minimum payment, infer installments, or use current debt as statement data. Archived card names and historical statements remain included.

Columns:

1. `statement_id`
2. `card_account_id`
3. `card_name`
4. `period_start`
5. `period_end`
6. `closing_date`
7. `due_date`
8. `statement_balance_cop`
9. `minimum_payment_cop`
10. `qualifying_payments_cop`
11. `minimum_remaining_cop`
12. `statement_remaining_cop`
13. `status`
14. `created_at`
15. `updated_at`

The current schema requires recorded statement amounts; an intentional zero remains `0`. No card number, CVV, expiration, credential, or installment field exists in the export. Filename: `money-control-card-statements-YYYY-MM-DD.csv`.

## Report-summary export

Period choices match Reports: Current month, Previous month, Last 3 months, Last 6 months, Current year, and inclusive custom range. `ReportService` remains authoritative, so transfers/voided rows are excluded and empty periods produce valid zero summary metrics.

Columns are `metric`, `value`, `period_start`, and `period_end`. The 15 metric rows are:

- `total_income_cop`
- `gross_expenses_cop`
- `refunds_cop`
- `net_expenses_cop`
- `net_result_cop`
- `expense_count`
- `refund_count`
- `income_count`
- `average_expense_cop`
- `largest_expense_cop`
- `largest_expense_date`
- `largest_expense_category`
- `largest_expense_account`
- `net_worth_start_cop`
- `net_worth_end_cop`

No chart image or detailed timeline file is generated. A single-month filename is `money-control-report-YYYY-MM.csv`; other ranges use `money-control-report-YYYY-MM-DD-to-YYYY-MM-DD.csv`.

## Investment exports

Two read-only CSV files (Investments v1, see [investments.md](investments.md)),
derived from the portfolio and valuation services — no SQL and no float money.

`money-control-investments-YYYY-MM-DD.csv` — one row per investment account
(active and archived): `investment_account_id`, `account_name`, `provider_name`,
`investment_type`, `tracking_mode`, `liquidity`, `currency_code`,
`current_value_minor`, `current_value_display`, `estimated_value_cop` (blank when
USD and no valuation rate), `total_contributions_minor`, `total_withdrawals_minor`,
`net_contributions_minor`, `estimated_gain_loss_minor`, `estimated_return_percentage`
(blank when net contributions ≤ 0), `latest_valuation_date`, `start_date`,
`maturity_date`, `status`.

`money-control-investment-valuations-YYYY-MM-DD.csv` — full manual valuation
history across all investment accounts: `valuation_id`, `investment_account_id`,
`account_name`, `valuation_date`, `currency_code`, `value_minor`, `value_display`,
`note`, `created_at`, `updated_at`.

Account/provider names and notes get formula-injection protection; numeric columns
stay numeric. Both refuse to create a file when there are no investments (or no
valuations). Estimated base-currency values use the current saved rates. Column names
keep their historical `_cop` suffixes; they hold the base currency, which
`currency_code` and the export metadata name.

## Limits, privacy, and application interactions

Transactions are counted before generation, warned at 25,000 rows, capped at 50,000, queried in 1,000-row ascending keyset batches, and serialized/written incrementally. A concurrent change that crosses the limit also aborts rather than truncating. Other list exports are capped at 10,000 rows. These safety limits support personal-ledger datasets with tens of thousands of transactions while bounding JavaScript object and native-write pressure.

CSV is plaintext. Every export requires a privacy confirmation. Notes default off. Export schemas contain no App Lock configuration, PIN/verifier/salt, biometric preference, SecureStore record, notification preference/identifier, migration record, backup metadata, or temporary UI state. Export code logs no rows or notes and emits no financial invalidation event.

The route stays inside the root App Lock and database gates. Generation cannot run before unlock. Returning from an external share target follows the existing AppState lock-delay behavior. No notification or background job is created.

No database migration, export-history table, generated-file record, dependency addition, or persisted export preference is required.

## Known v1 limitations

- Expo Sharing cannot confirm final save/share destination or distinguish a target selection from closing/canceling after the native surface opened.
- The action opens the Android share surface rather than retaining a Storage Access Framework directory grant.
- Notes preferences and export filters are screen-local and not persisted.
- Recurring occurrences, report timelines/category detail, transaction splits, and CSV headers-only files are not separate exports.
- Files are generated one at a time; there is no ZIP bundle.
- Physical Android verification remains necessary for provider-specific filename collisions, spreadsheet behavior, large-file latency, and App Lock timing on return.
