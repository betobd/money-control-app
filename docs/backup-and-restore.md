# Money Control — Backup and Restore

## Scope and user flow

Backup & Restore is a local-first, user-initiated recovery feature under More at `/backup`. It exports a logical, versioned JSON document instead of copying the live SQLite file. This avoids coupling a backup to SQLite journal state, Drizzle's migration bookkeeping, or a particular database file layout.

Creating a backup reads one consistent SQLite snapshot, builds and self-validates the JSON, writes a temporary cache file, and opens Android's native share sheet. Money Control deletes its temporary file when the share flow returns. The app can prove that the file was generated and that the native share UI opened; Android's sharing API does not report whether the user ultimately saved the file at a destination.

Restoring uses the native document picker with cache copying enabled. The app reads and validates file content rather than trusting the extension or MIME type, presents metadata and record counts, requires a second destructive confirmation, then replaces all included application data in one exclusive transaction. Picker cancellation is a neutral outcome and does not show an error.

## Version 2 file contract

Top-level fields are:

- `format`: literal `money-control-backup`.
- `formatVersion`: integer `2`, independent from the database schema version.
- `appVersion`, `schemaVersion`, and UTC `createdAt` provenance.
- `timezone`: literal `America/Bogota`; `currency`: literal `COP`.
- `summary`: counts for every collection.
- `transactionDateRange`: oldest/newest financial dates, or `null` for no transactions.
- `data`: all portable user data collections.
- `integrity`: `SHA-256` plus a lowercase hexadecimal checksum.

All monetary values remain safe integers in the same whole-COP representation used by the database. UTC audit timestamps, Bogotá-local `YYYY-MM-DD` financial dates, notes, IDs, archived state, status, and foreign-key IDs are preserved.

### Included collections and fields

| Collection | Fields |
|---|---|
| `accounts` | prior account fields plus `statementClosingDay` and `paymentDueDay` |
| `creditCardStatements` | ID, card relationship, period/closing/due dates, statement balance, minimum payment, audit timestamps |
| `categories` | `id`, `name`, `type`, `icon`, `isArchived`, `archivedAt`, `createdAt`, `updatedAt` |
| `transactions` | `id`, `type`, `status`, `amount`, `currency`, `accountId`, `destinationAccountId`, `categoryId`, `note`, `transactionDate`, `createdAt`, `updatedAt` |
| `transactionSplits` | `id`, `transactionId`, `accountId`, `amount`, `position` |
| `budgets` | `id`, `categoryId`, `month`, `limitAmount`, `createdAt`, `updatedAt` |
| `recurringTransactions` | `id`, `type`, `amount`, `currency`, `accountId`, `destinationAccountId`, `categoryId`, `note`, `frequency`, `interval`, `startDate`, `nextOccurrenceDate`, `endDate`, `isActive`, `endedAt`, `createdAt`, `updatedAt` |
| `recurringOccurrences` | `id`, `recurringTransactionId`, `scheduledDate`, `status`, the snapshotted transaction fields, `transactionId`, `createdAt`, `updatedAt` |

`transactionSplits` is included even though its UI workflow is not implemented, because it is application-owned financial data and excluding it would make a future or externally migrated database incomplete.

### Deliberately excluded

- Drizzle's `__drizzle_migrations` table and every SQLite internal table.
- The database file, WAL/SHM files, indexes, constraints, and other physical schema details.
- SecureStore values, OS credentials, device-local secrets, cache files, logs, and transient hook/UI state.
- App Lock configuration, biometric preference, PIN salts/verifiers, staged verifier changes, and failed-attempt/lockout records.
- App configuration and seeded defaults as a separate concept; existing category rows, including defaults that the user renamed or archived, are already included as categories.
- Device notification preferences, scheduled notification identifiers, notification error state, and budget threshold-delivery state.

Migration history remains owned by the installed app. Restore writes logical rows into the current migrated schema; a backup never rewinds or fabricates migration metadata.

## Determinism and checksum

Every exported collection is sorted by stable record ID. The SHA-256 input is canonical JSON with object keys sorted recursively and array order preserved. The sole excluded value is `integrity.checksum` itself; `integrity.algorithm` remains covered. The readable file is pretty-printed JSON and ends with a newline, but whitespace is not part of checksum verification because verification canonicalizes the parsed document again.

SHA-256 detects accidental damage and casual modification. It is not authentication: because the backup has no secret signature key, an attacker who can alter the file can also recompute the checksum. Version 2 remains intentionally unencrypted plaintext.

## Compatibility and migration policy

The portable format version is independent of migration `0007`. The importer accepts v1 and v2 and rejects unsupported or future versions before touching SQLite. The in-memory v1→v2 migration adds null cycle fields and an empty statement collection; it never invents statements or zero-value placeholders. An empty statement collection means no statement has been recorded. A differing source `schemaVersion` is shown as a warning when the portable format remains supported.

Version 2 restores IDs exactly. It does not merge, remap, or partially import records.

## Validation and defensive limits

Validation occurs before the confirmation can write anything, and relationships/checksum are checked again immediately before restore. It covers:

- maximum UTF-8 file size of 25 MiB and JSON nesting depth of 8;
- maximum lengths: IDs 200 characters, general strings 512, notes 200;
- maximum counts: 10,000 each for accounts, categories, budgets, and recurring rules; 50,000 each for transactions, splits, and occurrences;
- required collections/fields, enums, booleans, nullability, COP currency, safe-integer money, positive/non-zero constraints, UTC timestamps, and real calendar dates/months;
- duplicate primary IDs and current partial-unique account/category name rules;
- transaction, transfer, recurring-rule, and occurrence row shapes;
- every account/category/transaction/rule relationship, including archived referenced records;
- category/type compatibility, expense-only budgets, one category/month budget, split uniqueness, one occurrence per rule/date, and one posted occurrence per transaction;
- summary counts, transaction date range, and SHA-256 checksum.

The UI surfaces concise user-safe errors and never logs the backup contents or financial notes.

## Atomic replacement

Restore uses `withExclusiveTransactionAsync` with foreign keys still enabled. It deletes in dependency order:

1. recurring occurrences
2. transaction splits
3. budgets
4. recurring rules
5. transactions
6. credit-card statements
7. categories
8. accounts

It inserts in dependency order:

1. accounts
2. credit-card statements
3. categories
4. transactions
5. transaction splits
6. budgets
7. recurring rules
8. recurring occurrences

Prepared statements and bound parameters are used throughout. Before commit, the repository verifies collection counts and transaction date range, rechecks category compatibility, runs `PRAGMA foreign_key_check`, and requires `PRAGMA integrity_check = 'ok'`. Any deletion, insertion, validation, or integrity failure rejects the transaction and leaves the pre-restore database unchanged.

Only after commit does the service publish one global financial-data invalidation. Home, Transactions, Accounts, Budgets, Categories, Reports, and Recurring Transactions then reload from SQLite; no independent financial cache is restored.

## Security, privacy, and limitations

- Backups contain sensitive financial data and notes in plaintext. The screen warns users to store them only in a trusted location.
- Temporary export and picker copies live only in the app cache and are deleted on the best-effort cleanup path after use.
- The feature requests no broad storage permission and has no cloud/network component. The user chooses the destination/provider through Android system UI.
- There is no password protection, encryption, signature/authenticity, cloud sync, scheduled backup, merge import, partial restore, or cross-currency conversion.
- Version 2 supports only COP and the current Money Control logical model.
- Encryption can be added later with a new format version and an authenticated-encryption envelope; it should not silently reinterpret existing plaintext files.
- Restoring a financial backup never reads or writes SecureStore. It therefore cannot enable, disable, or alter the current device's App Lock, biometric preference, PIN verifier, or failed-attempt state. Restored financial data remains behind the current device lock when that lock is enabled.
- Restore preserves the current device's notification preferences. After the financial replacement commits, it cancels known local schedules, clears device-specific schedule/threshold metadata, rebuilds allowed recurring and daily work, and baselines restored budgets without historical alerts. It never requests notification permission or enables a reminder category. Notification cleanup failure cannot roll back the already committed financial restore.

## Verification

`npm run test:backup` covers deterministic serialization/checksums, empty and 10,000-transaction files, malformed/unsupported/oversized/deep inputs, duplicate and missing references, picker cancellation, extension-independent content validation, restore notification, and checksum tampering. Its file-backed SQLite test injects failures at multiple replacement stages to prove rollback, then verifies IDs, archived data, notes, transfers, card debt, recurring links, balances, budget spending, report totals, and persistence after reopening the database.
