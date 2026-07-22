import type { SQLiteBindParams, SQLiteDatabase } from 'expo-sqlite';

import { sqlite } from '@/database/client';
import { createBackupOverview } from './backup-serializer';
import {
  BackupRestoreError,
  type BackupRepository,
} from './backup.repository';
import type {
  BackupAccount,
  BackupCreditCardStatement,
  BackupBudget,
  BackupCategory,
  BackupDataV2,
  BackupOverview,
  BackupRecurringOccurrence,
  BackupRecurringTransaction,
  BackupTransaction,
  BackupTransactionSplit,
} from './backup.types';

type SqlAccount = Omit<BackupAccount, 'isArchived'> & { isArchived: number };
type SqlCategory = Omit<BackupCategory, 'isArchived'> & { isArchived: number };
type SqlRecurring = Omit<BackupRecurringTransaction, 'isActive'> & { isActive: number };

type OverviewRow = {
  accounts: number;
  categories: number;
  transactions: number;
  transactionSplits: number;
  budgets: number;
  recurringRules: number;
  recurringOccurrences: number;
  creditCardStatements: number;
  oldest: string | null;
  newest: string | null;
};

async function insertRows(
  database: SQLiteDatabase,
  sql: string,
  rows: SQLiteBindParams[],
): Promise<void> {
  if (!rows.length) return;
  const statement = await database.prepareAsync(sql);
  try {
    for (const row of rows) await statement.executeAsync(row);
  } finally {
    await statement.finalizeAsync();
  }
}

async function readOverview(database: SQLiteDatabase): Promise<BackupOverview> {
  const row = await database.getFirstAsync<OverviewRow>(`
    SELECT
      (SELECT count(*) FROM accounts) AS accounts,
      (SELECT count(*) FROM categories) AS categories,
      (SELECT count(*) FROM transactions) AS transactions,
      (SELECT count(*) FROM transaction_splits) AS transactionSplits,
      (SELECT count(*) FROM budgets) AS budgets,
      (SELECT count(*) FROM recurring_transactions) AS recurringRules,
      (SELECT count(*) FROM recurring_occurrences) AS recurringOccurrences,
      (SELECT count(*) FROM credit_card_statements) AS creditCardStatements,
      (SELECT min(transaction_date) FROM transactions) AS oldest,
      (SELECT max(transaction_date) FROM transactions) AS newest
  `);
  return {
    summary: {
      accounts: Number(row?.accounts ?? 0),
      categories: Number(row?.categories ?? 0),
      transactions: Number(row?.transactions ?? 0),
      transactionSplits: Number(row?.transactionSplits ?? 0),
      budgets: Number(row?.budgets ?? 0),
      recurringRules: Number(row?.recurringRules ?? 0),
      recurringOccurrences: Number(row?.recurringOccurrences ?? 0),
      creditCardStatements: Number(row?.creditCardStatements ?? 0),
    },
    transactionDateRange: {
      oldest: row?.oldest ?? null,
      newest: row?.newest ?? null,
    },
  };
}

async function readSnapshot(database: SQLiteDatabase): Promise<BackupDataV2> {
  const accounts = await database.getAllAsync<SqlAccount>(`
    SELECT id, name, type, currency, opening_balance AS openingBalance,
      credit_limit AS creditLimit, statement_closing_day AS statementClosingDay,
      payment_due_day AS paymentDueDay, is_archived AS isArchived,
      archived_at AS archivedAt, created_at AS createdAt, updated_at AS updatedAt
    FROM accounts ORDER BY id
  `);
  const categories = await database.getAllAsync<SqlCategory>(`
    SELECT id, name, type, icon, is_archived AS isArchived,
      archived_at AS archivedAt, created_at AS createdAt, updated_at AS updatedAt
    FROM categories ORDER BY id
  `);
  const transactions = await database.getAllAsync<BackupTransaction>(`
    SELECT id, type, status, amount, currency, account_id AS accountId,
      destination_account_id AS destinationAccountId, category_id AS categoryId,
      note, transaction_date AS transactionDate,
      created_at AS createdAt, updated_at AS updatedAt
    FROM transactions ORDER BY id
  `);
  const transactionSplits = await database.getAllAsync<BackupTransactionSplit>(`
    SELECT id, transaction_id AS transactionId, account_id AS accountId,
      amount, position
    FROM transaction_splits ORDER BY id
  `);
  const budgets = await database.getAllAsync<BackupBudget>(`
    SELECT id, category_id AS categoryId, month, limit_amount AS limitAmount,
      created_at AS createdAt, updated_at AS updatedAt
    FROM budgets ORDER BY id
  `);
  const recurringTransactions = await database.getAllAsync<SqlRecurring>(`
    SELECT id, type, amount, currency, account_id AS accountId,
      destination_account_id AS destinationAccountId, category_id AS categoryId,
      note, frequency, "interval", start_date AS startDate,
      next_occurrence_date AS nextOccurrenceDate, end_date AS endDate,
      is_active AS isActive, ended_at AS endedAt,
      created_at AS createdAt, updated_at AS updatedAt
    FROM recurring_transactions ORDER BY id
  `);
  const recurringOccurrences = await database.getAllAsync<BackupRecurringOccurrence>(`
    SELECT id, recurring_transaction_id AS recurringTransactionId,
      scheduled_date AS scheduledDate, status, type, amount, currency,
      account_id AS accountId, destination_account_id AS destinationAccountId,
      category_id AS categoryId, note, transaction_id AS transactionId,
      created_at AS createdAt, updated_at AS updatedAt
    FROM recurring_occurrences ORDER BY id
  `);
  const creditCardStatements = await database.getAllAsync<BackupCreditCardStatement>(`
    SELECT id, account_id AS accountId, period_start AS periodStart,
      period_end AS periodEnd, closing_date AS closingDate, due_date AS dueDate,
      statement_balance AS statementBalance, minimum_payment AS minimumPayment,
      created_at AS createdAt, updated_at AS updatedAt
    FROM credit_card_statements ORDER BY id
  `);

  return {
    accounts: accounts.map((row) => ({ ...row, isArchived: row.isArchived === 1 })),
    categories: categories.map((row) => ({ ...row, isArchived: row.isArchived === 1 })),
    transactions,
    transactionSplits,
    budgets,
    recurringTransactions: recurringTransactions.map((row) => ({
      ...row,
      isActive: row.isActive === 1,
    })),
    recurringOccurrences,
    creditCardStatements,
  };
}

async function insertSnapshot(database: SQLiteDatabase, data: BackupDataV2): Promise<void> {
  await insertRows(database, `
    INSERT INTO accounts (
      id, name, type, currency, opening_balance, credit_limit,
      statement_closing_day, payment_due_day, is_archived,
      archived_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, data.accounts.map((row) => [
    row.id, row.name, row.type, row.currency, row.openingBalance, row.creditLimit,
    row.statementClosingDay, row.paymentDueDay, row.isArchived ? 1 : 0,
    row.archivedAt, row.createdAt, row.updatedAt,
  ]));

  await insertRows(database, `
    INSERT INTO credit_card_statements (
      id, account_id, period_start, period_end, closing_date, due_date,
      statement_balance, minimum_payment, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, data.creditCardStatements.map((row) => [
    row.id, row.accountId, row.periodStart, row.periodEnd, row.closingDate,
    row.dueDate, row.statementBalance, row.minimumPayment, row.createdAt, row.updatedAt,
  ]));

  await insertRows(database, `
    INSERT INTO categories (
      id, name, type, icon, is_archived, archived_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, data.categories.map((row) => [
    row.id, row.name, row.type, row.icon, row.isArchived ? 1 : 0,
    row.archivedAt, row.createdAt, row.updatedAt,
  ]));

  await insertRows(database, `
    INSERT INTO transactions (
      id, type, status, amount, currency, account_id, destination_account_id,
      category_id, note, transaction_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, data.transactions.map((row) => [
    row.id, row.type, row.status, row.amount, row.currency, row.accountId,
    row.destinationAccountId, row.categoryId, row.note, row.transactionDate,
    row.createdAt, row.updatedAt,
  ]));

  await insertRows(database, `
    INSERT INTO transaction_splits (
      id, transaction_id, account_id, amount, position
    ) VALUES (?, ?, ?, ?, ?)
  `, data.transactionSplits.map((row) => [
    row.id, row.transactionId, row.accountId, row.amount, row.position,
  ]));

  await insertRows(database, `
    INSERT INTO budgets (
      id, category_id, month, limit_amount, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `, data.budgets.map((row) => [
    row.id, row.categoryId, row.month, row.limitAmount, row.createdAt, row.updatedAt,
  ]));

  await insertRows(database, `
    INSERT INTO recurring_transactions (
      id, type, amount, currency, account_id, destination_account_id,
      category_id, note, frequency, "interval", start_date,
      next_occurrence_date, end_date, is_active, ended_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, data.recurringTransactions.map((row) => [
    row.id, row.type, row.amount, row.currency, row.accountId,
    row.destinationAccountId, row.categoryId, row.note, row.frequency, row.interval,
    row.startDate, row.nextOccurrenceDate, row.endDate, row.isActive ? 1 : 0,
    row.endedAt, row.createdAt, row.updatedAt,
  ]));

  await insertRows(database, `
    INSERT INTO recurring_occurrences (
      id, recurring_transaction_id, scheduled_date, status, type, amount,
      currency, account_id, destination_account_id, category_id, note,
      transaction_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, data.recurringOccurrences.map((row) => [
    row.id, row.recurringTransactionId, row.scheduledDate, row.status, row.type,
    row.amount, row.currency, row.accountId, row.destinationAccountId,
    row.categoryId, row.note, row.transactionId, row.createdAt, row.updatedAt,
  ]));
}

async function runPostRestoreChecks(
  database: SQLiteDatabase,
  data: BackupDataV2,
): Promise<BackupOverview> {
  const actual = await readOverview(database);
  const expected = createBackupOverview(data);
  for (const key of Object.keys(expected.summary) as (keyof typeof expected.summary)[]) {
    if (actual.summary[key] !== expected.summary[key]) {
      throw new BackupRestoreError('count_mismatch', `Restored ${key} count does not match the backup.`);
    }
  }
  if (
    actual.transactionDateRange.oldest !== expected.transactionDateRange.oldest
    || actual.transactionDateRange.newest !== expected.transactionDateRange.newest
  ) {
    throw new BackupRestoreError('domain_integrity_failed', 'Restored transaction date range does not match the backup.');
  }

  const domain = await database.getFirstAsync<{ violations: number }>(`
    SELECT
      (SELECT count(*) FROM transactions AS t
        JOIN categories AS c ON c.id = t.category_id
        WHERE t.type IN ('income', 'expense') AND c.type <> t.type)
      + (SELECT count(*) FROM budgets AS b
        JOIN categories AS c ON c.id = b.category_id
        WHERE c.type <> 'expense')
      + (SELECT count(*) FROM recurring_transactions AS r
        JOIN categories AS c ON c.id = r.category_id
        WHERE r.type IN ('income', 'expense') AND c.type <> r.type)
      + (SELECT count(*) FROM recurring_occurrences AS o
        JOIN categories AS c ON c.id = o.category_id
        WHERE o.type IN ('income', 'expense') AND c.type <> o.type)
      + (SELECT count(*) FROM credit_card_statements AS s
        JOIN accounts AS a ON a.id = s.account_id
        WHERE a.type <> 'credit_card')
      AS violations
  `);
  if (Number(domain?.violations ?? 0) !== 0) {
    throw new BackupRestoreError('domain_integrity_failed', 'Restored financial category relationships are invalid.');
  }

  const foreignKeyIssues = await database.getAllAsync<{
    table: string;
    rowid: number;
    parent: string;
    fkid: number;
  }>('PRAGMA foreign_key_check');
  if (foreignKeyIssues.length) {
    throw new BackupRestoreError('foreign_key_check_failed', 'Restored data failed the foreign-key integrity check.');
  }

  const integrity = await database.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
  if (integrity?.integrity_check !== 'ok') {
    throw new BackupRestoreError('integrity_check_failed', 'Restored data failed the SQLite integrity check.');
  }
  return actual;
}

export class SQLiteBackupRepository implements BackupRepository {
  readOverview(): Promise<BackupOverview> {
    return readOverview(sqlite);
  }

  async readSnapshot(): Promise<BackupDataV2> {
    let snapshot: BackupDataV2 | undefined;
    await sqlite.withExclusiveTransactionAsync(async (transaction) => {
      snapshot = await readSnapshot(transaction);
    });
    if (!snapshot) throw new Error('Unable to read a complete database snapshot.');
    return snapshot;
  }

  async replaceAll(data: BackupDataV2): Promise<BackupOverview> {
    let overview: BackupOverview | undefined;
    await sqlite.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(`
        DELETE FROM credit_card_statements;
        DELETE FROM recurring_occurrences;
        DELETE FROM transaction_splits;
        DELETE FROM budgets;
        DELETE FROM recurring_transactions;
        DELETE FROM transactions;
        DELETE FROM categories;
        DELETE FROM accounts;
      `);
      await insertSnapshot(transaction, data);
      overview = await runPostRestoreChecks(transaction, data);
    });
    if (!overview) throw new Error('Restore did not produce a verified database state.');
    return overview;
  }
}
