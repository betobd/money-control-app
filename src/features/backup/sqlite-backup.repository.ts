import type { SQLiteBindParams, SQLiteDatabase } from 'expo-sqlite';
import { isSupportedCurrency } from '@/features/currency/currency';

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
  BackupBudgetRule,
  BackupMonthlyBudget,
  BackupCategory,
  BackupDataV7,
  BackupExchangeRate,
  BackupInvestmentAccount,
  BackupInvestmentValuation,
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
  investmentAccounts: number;
  investmentValuations: number;
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
      (SELECT count(*) FROM investment_accounts) AS investmentAccounts,
      (SELECT count(*) FROM investment_valuations) AS investmentValuations,
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
      investmentAccounts: Number(row?.investmentAccounts ?? 0),
      investmentValuations: Number(row?.investmentValuations ?? 0),
    },
    transactionDateRange: {
      oldest: row?.oldest ?? null,
      newest: row?.newest ?? null,
    },
  };
}

async function readSnapshot(database: SQLiteDatabase): Promise<BackupDataV7> {
  const accounts = await database.getAllAsync<SqlAccount>(`
    SELECT id, name, type, currency, opening_balance AS openingBalance,
      credit_limit AS creditLimit, statement_closing_day AS statementClosingDay,
      payment_due_day AS paymentDueDay, is_archived AS isArchived,
      archived_at AS archivedAt, created_at AS createdAt, updated_at AS updatedAt
    FROM accounts ORDER BY id
  `);
  const categories = await database.getAllAsync<SqlCategory>(`
    SELECT id, name, type, icon, parent_category_id AS parentCategoryId,
      is_archived AS isArchived,
      archived_at AS archivedAt, created_at AS createdAt, updated_at AS updatedAt
    FROM categories ORDER BY id
  `);
  const transactions = await database.getAllAsync<BackupTransaction>(`
    SELECT id, type, status, amount, currency, account_id AS accountId,
      destination_account_id AS destinationAccountId, category_id AS categoryId,
      subcategory_id AS subcategoryId,
      original_transaction_id AS originalTransactionId,
      base_amount_minor AS baseAmountMinor, base_currency_code AS baseCurrencyCode,
      exchange_rate_scaled AS exchangeRateScaled,
      exchange_rate_scale AS exchangeRateScale,
      exchange_rate_base_code AS exchangeRateBaseCode,
      exchange_rate_quote_code AS exchangeRateQuoteCode,
      exchange_rate_date AS exchangeRateDate,
      exchange_rate_source AS exchangeRateSource,
      destination_amount_minor AS destinationAmountMinor,
      destination_currency_code AS destinationCurrencyCode,
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
      color, rule_id AS ruleId, created_at AS createdAt, updated_at AS updatedAt
    FROM budgets ORDER BY id
  `);
  const budgetRules = await database.getAllAsync<Omit<BackupBudgetRule, 'isActive'> & { isActive: number }>(`
    SELECT id, category_id AS categoryId, limit_amount AS limitAmount, color,
      start_month AS startMonth, is_active AS isActive,
      created_at AS createdAt, updated_at AS updatedAt
    FROM budget_rules ORDER BY id
  `);
  const monthlyBudgets = await database.getAllAsync<Omit<BackupMonthlyBudget, 'isActive'> & { isActive: number }>(`
    SELECT id, month, limit_amount AS limitAmount, is_active AS isActive,
      created_at AS createdAt, updated_at AS updatedAt
    FROM monthly_budgets ORDER BY month
  `);
  const recurringTransactions = await database.getAllAsync<SqlRecurring>(`
    SELECT id, type, amount, currency, account_id AS accountId,
      destination_account_id AS destinationAccountId, category_id AS categoryId,
      subcategory_id AS subcategoryId,
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
      category_id AS categoryId, subcategory_id AS subcategoryId,
      note, transaction_id AS transactionId,
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
  const exchangeRates = await database.getAllAsync<BackupExchangeRate>(`
    SELECT id, base_currency_code AS baseCurrencyCode, quote_currency_code AS quoteCurrencyCode,
      rate_scaled AS rateScaled, rate_scale AS rateScale, effective_date AS effectiveDate,
      fetched_at AS fetchedAt, provider, source, created_at AS createdAt, updated_at AS updatedAt
    FROM exchange_rates ORDER BY id
  `);
  const settings = await database.getFirstAsync<{ baseCurrencyCode: string }>(
    "SELECT base_currency_code AS baseCurrencyCode FROM app_settings WHERE id = 'device'",
  );
  if (!settings || !isSupportedCurrency(settings.baseCurrencyCode)) {
    throw new Error('The base currency is missing or unsupported; cannot write a backup.');
  }
  const baseCurrencyCode = settings.baseCurrencyCode;
  const investmentAccounts = await database.getAllAsync<BackupInvestmentAccount>(`
    SELECT account_id AS accountId, investment_type AS investmentType,
      tracking_mode AS trackingMode, liquidity, provider_name AS providerName,
      start_date AS startDate, maturity_date AS maturityDate, note,
      created_at AS createdAt, updated_at AS updatedAt
    FROM investment_accounts ORDER BY account_id
  `);
  const investmentValuations = await database.getAllAsync<BackupInvestmentValuation>(`
    SELECT id, investment_account_id AS investmentAccountId, value_minor AS valueMinor,
      basis_minor AS basisMinor, currency_code AS currencyCode,
      valuation_date AS valuationDate, note, created_at AS createdAt, updated_at AS updatedAt
    FROM investment_valuations ORDER BY id
  `);

  return {
    accounts: accounts.map((row) => ({ ...row, isArchived: row.isArchived === 1 })),
    categories: categories.map((row) => ({ ...row, isArchived: row.isArchived === 1 })),
    transactions,
    transactionSplits,
    budgets,
    budgetRules: budgetRules.map((row) => ({ ...row, isActive: row.isActive === 1 })),
    monthlyBudgets: monthlyBudgets.map((row) => ({ ...row, isActive: row.isActive === 1 })),
    recurringTransactions: recurringTransactions.map((row) => ({
      ...row,
      isActive: row.isActive === 1,
    })),
    recurringOccurrences,
    creditCardStatements,
    investmentAccounts,
    investmentValuations,
    baseCurrencyCode,
    exchangeRates,
  };
}

async function insertSnapshot(database: SQLiteDatabase, data: BackupDataV7): Promise<void> {
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

  // Parents before subcategories: `categories.parent_category_id` is a
  // self-reference with ON DELETE RESTRICT, so a child inserted first would fail
  // the foreign-key check. Depth is capped at two, which makes this two-pass
  // split a complete topological order — the same shape as the refund ordering
  // below, and the reason no general sort is needed.
  await insertRows(database, `
    INSERT INTO categories (
      id, name, type, icon, parent_category_id, is_archived, archived_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    ...data.categories.filter((row) => row.parentCategoryId === null),
    ...data.categories.filter((row) => row.parentCategoryId !== null),
  ].map((row) => [
    row.id, row.name, row.type, row.icon, row.parentCategoryId, row.isArchived ? 1 : 0,
    row.archivedAt, row.createdAt, row.updatedAt,
  ]));

  await insertRows(database, `
    INSERT INTO transactions (
      id, type, status, amount, currency, account_id, destination_account_id,
      category_id, subcategory_id, original_transaction_id,
      base_amount_minor, base_currency_code,
      exchange_rate_scaled, exchange_rate_scale,
      exchange_rate_base_code, exchange_rate_quote_code,
      exchange_rate_date, exchange_rate_source,
      destination_amount_minor, destination_currency_code,
      note, transaction_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    ...data.transactions.filter((row) => row.type !== 'refund'),
    ...data.transactions.filter((row) => row.type === 'refund'),
  ].map((row) => [
    row.id, row.type, row.status, row.amount, row.currency, row.accountId,
    row.destinationAccountId, row.categoryId, row.subcategoryId, row.originalTransactionId,
    row.baseAmountMinor, row.baseCurrencyCode,
    row.exchangeRateScaled, row.exchangeRateScale,
    row.exchangeRateBaseCode, row.exchangeRateQuoteCode,
    row.exchangeRateDate, row.exchangeRateSource,
    row.destinationAmountMinor, row.destinationCurrencyCode,
    row.note, row.transactionDate, row.createdAt, row.updatedAt,
  ]));

  await insertRows(database, `
    INSERT INTO transaction_splits (
      id, transaction_id, account_id, amount, position
    ) VALUES (?, ?, ?, ?, ?)
  `, data.transactionSplits.map((row) => [
    row.id, row.transactionId, row.accountId, row.amount, row.position,
  ]));

  await insertRows(database, `
    INSERT INTO budget_rules (
      id, category_id, limit_amount, color, start_month, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, (data.budgetRules ?? []).map((row) => [
    row.id, row.categoryId, row.limitAmount, row.color ?? null, row.startMonth, row.isActive ? 1 : 0, row.createdAt, row.updatedAt,
  ]));

  await insertRows(database, `
    INSERT INTO monthly_budgets (
      id, month, limit_amount, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `, (data.monthlyBudgets ?? []).map((row) => [
    row.id, row.month, row.limitAmount, row.isActive ? 1 : 0, row.createdAt, row.updatedAt,
  ]));

  await insertRows(database, `
    INSERT INTO budgets (
      id, category_id, month, limit_amount, color, rule_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, data.budgets.map((row) => [
    row.id, row.categoryId, row.month, row.limitAmount, row.color ?? null, row.ruleId ?? null, row.createdAt, row.updatedAt,
  ]));

  await insertRows(database, `
    INSERT INTO recurring_transactions (
      id, type, amount, currency, account_id, destination_account_id,
      category_id, subcategory_id, note, frequency, "interval", start_date,
      next_occurrence_date, end_date, is_active, ended_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, data.recurringTransactions.map((row) => [
    row.id, row.type, row.amount, row.currency, row.accountId,
    row.destinationAccountId, row.categoryId, row.subcategoryId, row.note, row.frequency, row.interval,
    row.startDate, row.nextOccurrenceDate, row.endDate, row.isActive ? 1 : 0,
    row.endedAt, row.createdAt, row.updatedAt,
  ]));

  await insertRows(database, `
    INSERT INTO recurring_occurrences (
      id, recurring_transaction_id, scheduled_date, status, type, amount,
      currency, account_id, destination_account_id, category_id, subcategory_id, note,
      transaction_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, data.recurringOccurrences.map((row) => [
    row.id, row.recurringTransactionId, row.scheduledDate, row.status, row.type,
    row.amount, row.currency, row.accountId, row.destinationAccountId,
    row.categoryId, row.subcategoryId, row.note, row.transactionId, row.createdAt, row.updatedAt,
  ]));

  await insertRows(database, `
    INSERT INTO investment_accounts (
      account_id, investment_type, tracking_mode, liquidity, provider_name,
      start_date, maturity_date, note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, data.investmentAccounts.map((row) => [
    row.accountId, row.investmentType, row.trackingMode, row.liquidity, row.providerName,
    row.startDate, row.maturityDate, row.note, row.createdAt, row.updatedAt,
  ]));

  await insertRows(database, `
    INSERT INTO investment_valuations (
      id, investment_account_id, value_minor, basis_minor, currency_code,
      valuation_date, note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, data.investmentValuations.map((row) => [
    row.id, row.investmentAccountId, row.valueMinor, row.basisMinor, row.currencyCode,
    row.valuationDate, row.note, row.createdAt, row.updatedAt,
  ]));

  await insertRows(database, `
    INSERT INTO exchange_rates (
      id, base_currency_code, quote_currency_code, rate_scaled, rate_scale,
      effective_date, fetched_at, provider, source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, data.exchangeRates.map((row) => [
    row.id, row.baseCurrencyCode, row.quoteCurrencyCode, row.rateScaled, row.rateScale,
    row.effectiveDate, row.fetchedAt, row.provider, row.source, row.createdAt, row.updatedAt,
  ]));

  // The settings row always exists (migration 0014 seeds it), so this is an
  // update rather than an insert: restoring a backup adopts the base currency the
  // backup was written with, which is the only currency its stored
  // `base_amount_minor` snapshots make sense in.
  await database.runAsync(
    'UPDATE app_settings SET base_currency_code = ?, updated_at = ? WHERE id = ?',
    data.baseCurrencyCode,
    new Date().toISOString(),
    'device',
  );
}

async function runPostRestoreChecks(
  database: SQLiteDatabase,
  data: BackupDataV7,
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
      -- Two-level classification: a subcategory must sit under a top-level
      -- category of the same type, and every stored pair must actually belong
      -- together. The triggers enforce this on write; this proves it held for
      -- the whole restored set, including rows the triggers saw one at a time.
      + (SELECT count(*) FROM categories AS child
        JOIN categories AS parent ON parent.id = child.parent_category_id
        WHERE parent.parent_category_id IS NOT NULL OR parent.type <> child.type)
      + (SELECT count(*) FROM transactions AS t
        WHERE t.subcategory_id IS NOT NULL
          AND (SELECT parent_category_id FROM categories WHERE id = t.subcategory_id) IS NOT t.category_id)
      + (SELECT count(*) FROM recurring_transactions AS r
        WHERE r.subcategory_id IS NOT NULL
          AND (SELECT parent_category_id FROM categories WHERE id = r.subcategory_id) IS NOT r.category_id)
      + (SELECT count(*) FROM recurring_occurrences AS o
        WHERE o.subcategory_id IS NOT NULL
          AND (SELECT parent_category_id FROM categories WHERE id = o.subcategory_id) IS NOT o.category_id)
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

  async readSnapshot(): Promise<BackupDataV7> {
    let snapshot: BackupDataV7 | undefined;
    await sqlite.withExclusiveTransactionAsync(async (transaction) => {
      snapshot = await readSnapshot(transaction);
    });
    if (!snapshot) throw new Error('Unable to read a complete database snapshot.');
    return snapshot;
  }

  async replaceAll(data: BackupDataV7): Promise<BackupOverview> {
    let overview: BackupOverview | undefined;
    await sqlite.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(`
        DELETE FROM investment_valuations;
        DELETE FROM investment_accounts;
        DELETE FROM exchange_rates;
        DELETE FROM credit_card_statements;
        DELETE FROM recurring_occurrences;
        DELETE FROM transaction_splits;
        DELETE FROM monthly_budgets;
        DELETE FROM budgets;
        DELETE FROM budget_rules;
        DELETE FROM recurring_transactions;
        -- Refunds self-reference their original expense via
        -- transactions.original_transaction_id (ON DELETE RESTRICT), which is
        -- enforced per row. Remove refund children before their parents so the
        -- bulk delete below cannot trip the constraint mid-statement.
        DELETE FROM transactions WHERE type = 'refund';
        DELETE FROM transactions;
        -- Same hazard, same fix: categories.parent_category_id is a
        -- self-reference with ON DELETE RESTRICT, enforced per row. A bulk
        -- delete reaches a parent before its subcategories (parents are
        -- inserted first, so they hold lower rowids) and fails. Verified
        -- against SQLite in backup_restore_database_test.py.
        DELETE FROM categories WHERE parent_category_id IS NOT NULL;
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
