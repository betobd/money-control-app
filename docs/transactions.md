# Money Control — Transaction history

## Search and filters

Transaction history is a read-only view over persisted SQLite data. Search and filters never change balances, budgets, Home totals, or any other financial calculation. Voided transactions remain available to history queries.

Search trims surrounding whitespace and treats an empty value as no search. It matches note, category name, source account name, transfer destination account name, and the stored transaction type using parameterized `lower(...) LIKE` predicates. SQLite's built-in case folding is reliable for ASCII text but is not a complete Unicode or accent-folding implementation. Accent-insensitive behavior is therefore not guaranteed; no FTS table or normalized search column is used in this phase.

The available filters are:

- One transaction type: Expense, Income, Transfer, or All.
- One status: Posted, Voided, or All.
- One historically referenced account, or All accounts. A transfer matches when the account is its source or destination.
- One historically referenced expense/income category, or All categories. Transfers never match a category filter.
- Current month, Previous month, Last 30 days, an inclusive custom range, or All time.

Every active predicate combines with `AND`. Account source/destination matching is the only internal `OR`. Archived accounts and categories referenced by transactions remain visible and are labeled Archived. Accounts/categories without historical transaction references are omitted from filter options.

The initial Transactions screen date range is Current month because earlier product documentation did not specify a default. Clear all selects All time and removes type, status, account, and category filters. Search is cleared separately. Filters and search remain screen-local for the current mounted session, including while the transaction details modal is open.

All date comparisons use `transaction_date` as an inclusive `YYYY-MM-DD` Bogotá-local calendar date. Audit timestamps never determine filter membership. A custom end date earlier than its start date is rejected before querying.

## Query and pagination

`TransactionListQuery` contains optional search, type/status arrays, account/category IDs, inclusive date bounds, a limit, and a compound cursor. `TransactionService` trims and validates inputs. `SQLiteTransactionRepository` adds only present SQL predicates, binds all values, and returns account/category display data through joins rather than per-row lookups.

History is ordered by:

1. `transaction_date DESC`
2. `created_at DESC`
3. `id DESC`

The first page contains 40 transactions. A next-page cursor repeats those three stable values and applies the corresponding descending lexicographic predicate. This avoids duplicate or missing rows when several transactions share a date and creation timestamp. Search/filter changes and financial-data invalidation after create, edit, or void reload page one while retaining the current filter selection.

The existing transaction-date, type/date, account, destination-account, and category indexes support the MVP predicates. No migration or FTS index was added. Search begins with a wildcard and therefore does not benefit from a conventional B-tree index; performance should be measured against realistic history sizes before adding search-specific storage.

## UI states

The Transactions screen distinguishes initial loading, empty database, no matching results, incremental loading, and query error states. No matching results offers separate Clear filters and, when relevant, Clear search actions. Results remain grouped by financial date, retain Posted/Voided presentation, and continue to open the existing details route.
