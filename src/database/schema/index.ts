import { sql } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import { budgetColorKeys, type BudgetColorKey } from '@/constants/theme';

const MAX_SAFE_MONEY = 9_007_199_254_740_991;
const MAX_SAFE_MONEY_SQL = sql.raw(String(MAX_SAFE_MONEY));
const MIN_SAFE_MONEY_SQL = sql.raw(String(-MAX_SAFE_MONEY));

// Allowed per-budget color keys (see budgetSwatches in constants/theme).
const BUDGET_COLORS_ENUM = budgetColorKeys as [BudgetColorKey, ...BudgetColorKey[]];
const BUDGET_COLORS_SQL = sql.raw(`(${budgetColorKeys.map((key) => `'${key}'`).join(', ')})`);

// Multi-Currency v1 supports COP (base) and USD only.
const SUPPORTED_CURRENCIES_SQL = sql.raw(`('COP', 'USD')`);
const EXCHANGE_RATE_SOURCES_SQL = sql.raw(
  `('frankfurter', 'manual', 'transfer_effective', 'frankfurter_prefill')`,
);
const VALUATION_RATE_SOURCES_SQL = sql.raw(`('frankfurter', 'manual')`);

// Investments v1 (balance tracking). Enums for the investment-account metadata.
const INVESTMENT_TYPES_SQL = sql.raw(
  `('brokerage', 'fixed_term_deposit', 'voluntary_pension', 'investment_fund', 'private_investment', 'other')`,
);
// Only `balance` in v1; the enum reserves room for `holdings` in Investments v2.
const INVESTMENT_TRACKING_MODES_SQL = sql.raw(`('balance')`);
const INVESTMENT_LIQUIDITY_SQL = sql.raw(`('liquid', 'restricted', 'locked')`);

const auditColumns = {
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
};

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type', { enum: ['checking', 'savings', 'credit_card', 'cash', 'investment', 'other'] }).notNull(),
    currency: text('currency').notNull().default('COP'),
    openingBalance: integer('opening_balance').notNull().default(0),
    creditLimit: integer('credit_limit'),
    statementClosingDay: integer('statement_closing_day'),
    paymentDueDay: integer('payment_due_day'),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    archivedAt: text('archived_at'),
    ...auditColumns,
  },
  (table) => [
    check('accounts_name_not_empty', sql`length(trim(${table.name})) > 0`),
    check('accounts_currency_supported', sql`${table.currency} IN ${SUPPORTED_CURRENCIES_SQL}`),
    check('accounts_type_valid', sql`${table.type} IN ('checking', 'savings', 'credit_card', 'cash', 'investment', 'other')`),
    check('accounts_created_at_utc', sql`${table.createdAt} GLOB '????-??-??T??:??:??*Z'`),
    check('accounts_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
    check('accounts_archived_at_utc', sql`${table.archivedAt} IS NULL OR ${table.archivedAt} GLOB '????-??-??T??:??:??*Z'`),
    check(
      'accounts_opening_balance_safe',
      sql`typeof(${table.openingBalance}) = 'integer' AND ${table.openingBalance} BETWEEN ${MIN_SAFE_MONEY_SQL} AND ${MAX_SAFE_MONEY_SQL}`,
    ),
    check(
      'accounts_credit_limit_valid',
      sql`${table.creditLimit} IS NULL OR (typeof(${table.creditLimit}) = 'integer' AND ${table.type} = 'credit_card' AND ${table.creditLimit} >= 0 AND ${table.creditLimit} <= ${MAX_SAFE_MONEY_SQL})`,
    ),
    check(
      'accounts_statement_closing_day_valid',
      sql`${table.statementClosingDay} IS NULL OR (typeof(${table.statementClosingDay}) = 'integer' AND ${table.type} = 'credit_card' AND ${table.statementClosingDay} BETWEEN 1 AND 31)`,
    ),
    check(
      'accounts_payment_due_day_valid',
      sql`${table.paymentDueDay} IS NULL OR (typeof(${table.paymentDueDay}) = 'integer' AND ${table.type} = 'credit_card' AND ${table.paymentDueDay} BETWEEN 1 AND 31)`,
    ),
    index('accounts_archived_idx').on(table.isArchived),
    uniqueIndex('accounts_active_name_uidx')
      .on(sql`lower(trim(${table.name}))`)
      .where(sql`${table.isArchived} = 0`),
  ],
);

export const creditCardStatements = sqliteTable(
  'credit_card_statements',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    periodStart: text('period_start').notNull(),
    periodEnd: text('period_end').notNull(),
    closingDate: text('closing_date').notNull(),
    dueDate: text('due_date').notNull(),
    statementBalance: integer('statement_balance').notNull(),
    minimumPayment: integer('minimum_payment').notNull(),
    ...auditColumns,
  },
  (table) => [
    check('credit_card_statements_period_start_valid', sql`${table.periodStart} GLOB '????-??-??' AND date(${table.periodStart}) = ${table.periodStart}`),
    check('credit_card_statements_period_end_valid', sql`${table.periodEnd} GLOB '????-??-??' AND date(${table.periodEnd}) = ${table.periodEnd}`),
    check('credit_card_statements_closing_date_valid', sql`${table.closingDate} GLOB '????-??-??' AND date(${table.closingDate}) = ${table.closingDate}`),
    check('credit_card_statements_due_date_valid', sql`${table.dueDate} GLOB '????-??-??' AND date(${table.dueDate}) = ${table.dueDate}`),
    check('credit_card_statements_period_valid', sql`${table.periodStart} <= ${table.periodEnd} AND ${table.closingDate} >= ${table.periodEnd} AND ${table.dueDate} >= ${table.closingDate}`),
    check('credit_card_statements_balance_valid', sql`typeof(${table.statementBalance}) = 'integer' AND ${table.statementBalance} BETWEEN 0 AND ${MAX_SAFE_MONEY_SQL}`),
    check('credit_card_statements_minimum_valid', sql`typeof(${table.minimumPayment}) = 'integer' AND ${table.minimumPayment} BETWEEN 0 AND ${table.statementBalance}`),
    check('credit_card_statements_created_at_utc', sql`${table.createdAt} GLOB '????-??-??T??:??:??*Z'`),
    check('credit_card_statements_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
    uniqueIndex('credit_card_statements_account_closing_uidx').on(table.accountId, table.closingDate),
    index('credit_card_statements_account_period_idx').on(table.accountId, table.periodEnd),
    index('credit_card_statements_due_date_idx').on(table.dueDate),
  ],
);

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type', { enum: ['expense', 'income'] }).notNull(),
    icon: text('icon'),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    archivedAt: text('archived_at'),
    ...auditColumns,
    // Appended by migration 0013 (SQLite ADD COLUMN adds it as the last column).
    // NULL parent = category, set parent = subcategory. Depth is capped at two by
    // triggers, because a CHECK cannot run the required subquery.
    parentCategoryId: text('parent_category_id').references((): AnySQLiteColumn => categories.id, {
      onDelete: 'restrict',
      onUpdate: 'restrict',
    }),
  },
  (table) => [
    check('categories_name_not_empty', sql`length(trim(${table.name})) > 0`),
    check('categories_type_valid', sql`${table.type} IN ('expense', 'income')`),
    check('categories_created_at_utc', sql`${table.createdAt} GLOB '????-??-??T??:??:??*Z'`),
    check('categories_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
    check('categories_archived_at_utc', sql`${table.archivedAt} IS NULL OR ${table.archivedAt} GLOB '????-??-??T??:??:??*Z'`),
    index('categories_archived_idx').on(table.isArchived),
    index('categories_type_idx').on(table.type),
    index('categories_parent_idx').on(table.parentCategoryId),
    // coalesce() is required: a unique index treats NULLs as distinct, so indexing
    // the raw parent would silently allow two root categories with the same name.
    uniqueIndex('categories_active_scope_name_uidx')
      .on(table.type, sql`coalesce(${table.parentCategoryId}, '')`, sql`lower(trim(${table.name}))`)
      .where(sql`${table.isArchived} = 0`),
  ],
);

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['income', 'expense', 'transfer', 'refund'] }).notNull(),
    status: text('status', { enum: ['posted', 'voided'] }).notNull().default('posted'),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('COP'),
    accountId: text('account_id').references(() => accounts.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    destinationAccountId: text('destination_account_id').references(() => accounts.id, {
      onDelete: 'restrict',
      onUpdate: 'restrict',
    }),
    categoryId: text('category_id').references(() => categories.id, {
      onDelete: 'restrict',
      onUpdate: 'restrict',
    }),
    originalTransactionId: text('original_transaction_id').references(
      (): AnySQLiteColumn => transactions.id,
      { onDelete: 'restrict', onUpdate: 'restrict' },
    ),
    // COP base-currency snapshot for income/expense/refund (NULL for transfers).
    baseAmountMinor: integer('base_amount_minor'),
    // Immutable exchange-rate snapshot captured at record time (NULL for COP).
    exchangeRateScaled: integer('exchange_rate_scaled'),
    exchangeRateScale: integer('exchange_rate_scale'),
    exchangeRateDate: text('exchange_rate_date'),
    exchangeRateSource: text('exchange_rate_source'),
    // Destination leg for transfers (source leg reuses amount/currency/accountId).
    destinationAmountMinor: integer('destination_amount_minor'),
    destinationCurrencyCode: text('destination_currency_code'),
    note: text('note'),
    transactionDate: text('transaction_date').notNull(),
    ...auditColumns,
    // Appended by migration 0013. Optional second classification level; its parent
    // must equal `category_id` (enforced by trigger). Transfers and refunds have a
    // NULL category, so the CHECK also keeps them free of a subcategory.
    subcategoryId: text('subcategory_id')
      .references((): AnySQLiteColumn => categories.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
  },
  (table) => [
    check('transactions_type_valid', sql`${table.type} IN ('income', 'expense', 'transfer', 'refund')`),
    check('transactions_status_valid', sql`${table.status} IN ('posted', 'voided')`),
    check('transactions_amount_positive', sql`typeof(${table.amount}) = 'integer' AND ${table.amount} > 0 AND ${table.amount} <= ${MAX_SAFE_MONEY_SQL}`),
    check('transactions_currency_supported', sql`${table.currency} IN ${SUPPORTED_CURRENCIES_SQL}`),
    check(
      'transactions_date_valid',
      sql`${table.transactionDate} GLOB '????-??-??' AND date(${table.transactionDate}) = ${table.transactionDate}`,
    ),
    check('transactions_created_at_utc', sql`${table.createdAt} GLOB '????-??-??T??:??:??*Z'`),
    check('transactions_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
    check(
      'transactions_shape_valid',
      sql`(
        (${table.type} IN ('income', 'expense') AND ${table.accountId} IS NOT NULL AND ${table.destinationAccountId} IS NULL AND ${table.categoryId} IS NOT NULL AND ${table.originalTransactionId} IS NULL)
        OR
        (${table.type} = 'transfer' AND ${table.accountId} IS NOT NULL AND ${table.destinationAccountId} IS NOT NULL AND ${table.accountId} <> ${table.destinationAccountId} AND ${table.categoryId} IS NULL AND ${table.originalTransactionId} IS NULL)
        OR
        (${table.type} = 'refund' AND ${table.accountId} IS NOT NULL AND ${table.destinationAccountId} IS NULL AND ${table.categoryId} IS NULL AND ${table.originalTransactionId} IS NOT NULL AND ${table.originalTransactionId} <> ${table.id})
      )`,
    ),
    // Base COP snapshot: absent for transfers; for others it is optional (COP rows
    // may omit it and be read as COALESCE(base_amount_minor, amount)) but, when
    // present, is a positive safe integer.
    check(
      'transactions_base_amount_valid',
      sql`(
        (${table.type} = 'transfer' AND ${table.baseAmountMinor} IS NULL)
        OR
        (${table.type} <> 'transfer' AND (${table.baseAmountMinor} IS NULL OR (typeof(${table.baseAmountMinor}) = 'integer' AND ${table.baseAmountMinor} > 0 AND ${table.baseAmountMinor} <= ${MAX_SAFE_MONEY_SQL})))
      )`,
    ),
    // Destination leg is only for transfers; optional (same-currency COP transfers
    // may omit it) but valid when present.
    check(
      'transactions_destination_leg_valid',
      sql`(
        (${table.type} = 'transfer' AND (${table.destinationAmountMinor} IS NULL OR (typeof(${table.destinationAmountMinor}) = 'integer' AND ${table.destinationAmountMinor} > 0 AND ${table.destinationAmountMinor} <= ${MAX_SAFE_MONEY_SQL})) AND (${table.destinationCurrencyCode} IS NULL OR ${table.destinationCurrencyCode} IN ${SUPPORTED_CURRENCIES_SQL}))
        OR
        (${table.type} <> 'transfer' AND ${table.destinationAmountMinor} IS NULL AND ${table.destinationCurrencyCode} IS NULL)
      )`,
    ),
    // A foreign-currency (USD) income/expense/refund MUST carry a COP base snapshot
    // and a full rate snapshot. COP rows are exempt.
    check(
      'transactions_foreign_snapshot_present',
      sql`(
        ${table.type} = 'transfer'
        OR ${table.currency} = 'COP'
        OR (${table.baseAmountMinor} IS NOT NULL AND typeof(${table.exchangeRateScaled}) = 'integer' AND ${table.exchangeRateScaled} > 0 AND typeof(${table.exchangeRateScale}) = 'integer' AND ${table.exchangeRateScale} > 0 AND ${table.exchangeRateDate} IS NOT NULL)
      )`,
    ),
    // A cross-currency transfer MUST carry a full effective-rate snapshot. A
    // same-currency transfer (or one with an omitted destination currency, read as
    // the source currency) is exempt.
    check(
      'transactions_transfer_rate_present',
      sql`(
        ${table.type} <> 'transfer'
        OR coalesce(${table.destinationCurrencyCode}, ${table.currency}) = ${table.currency}
        OR (typeof(${table.exchangeRateScaled}) = 'integer' AND ${table.exchangeRateScaled} > 0 AND typeof(${table.exchangeRateScale}) = 'integer' AND ${table.exchangeRateScale} > 0 AND ${table.exchangeRateDate} IS NOT NULL)
      )`,
    ),
    // Rate columns, when present, are valid.
    check(
      'transactions_rate_columns_valid',
      sql`(
        (${table.exchangeRateScaled} IS NULL OR (typeof(${table.exchangeRateScaled}) = 'integer' AND ${table.exchangeRateScaled} > 0 AND ${table.exchangeRateScaled} <= ${MAX_SAFE_MONEY_SQL}))
        AND (${table.exchangeRateScale} IS NULL OR (typeof(${table.exchangeRateScale}) = 'integer' AND ${table.exchangeRateScale} > 0 AND ${table.exchangeRateScale} <= ${MAX_SAFE_MONEY_SQL}))
        AND (${table.exchangeRateDate} IS NULL OR (${table.exchangeRateDate} GLOB '????-??-??' AND date(${table.exchangeRateDate}) = ${table.exchangeRateDate}))
        AND (${table.exchangeRateSource} IS NULL OR ${table.exchangeRateSource} IN ${EXCHANGE_RATE_SOURCES_SQL})
      )`,
    ),
    index('transactions_date_idx').on(table.transactionDate),
    index('transactions_type_date_idx').on(table.type, table.transactionDate),
    index('transactions_account_idx').on(table.accountId),
    index('transactions_destination_account_idx').on(table.destinationAccountId),
    index('transactions_category_idx').on(table.categoryId),
    index('transactions_subcategory_idx').on(table.subcategoryId),
    check('transactions_subcategory_requires_category', sql`${table.subcategoryId} IS NULL OR ${table.categoryId} IS NOT NULL`),
    index('transactions_original_status_idx').on(table.originalTransactionId, table.status),
  ],
);

export const transactionSplits = sqliteTable(
  'transaction_splits',
  {
    id: text('id').primaryKey(),
    transactionId: text('transaction_id')
      .notNull()
      .references(() => transactions.id, { onDelete: 'cascade', onUpdate: 'restrict' }),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    amount: integer('amount').notNull(),
    position: integer('position').notNull(),
  },
  (table) => [
    check(
      'transaction_splits_amount_nonzero_safe',
      sql`typeof(${table.amount}) = 'integer' AND ${table.amount} <> 0 AND ${table.amount} BETWEEN ${MIN_SAFE_MONEY_SQL} AND ${MAX_SAFE_MONEY_SQL}`,
    ),
    check('transaction_splits_position_nonnegative', sql`${table.position} >= 0`),
    uniqueIndex('transaction_splits_transaction_position_uidx').on(table.transactionId, table.position),
    uniqueIndex('transaction_splits_transaction_account_uidx').on(table.transactionId, table.accountId),
    index('transaction_splits_account_idx').on(table.accountId),
  ],
);

export const budgets = sqliteTable(
  'budgets',
  {
    id: text('id').primaryKey(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    month: text('month').notNull(),
    limitAmount: integer('limit_amount').notNull(),
    ...auditColumns,
    // Appended by migration 0010 (SQLite ADD COLUMN adds it as the last column).
    color: text('color', { enum: BUDGET_COLORS_ENUM }),
    // Appended by migration 0011. Links a materialized instance to its rule.
    ruleId: text('rule_id').references((): AnySQLiteColumn => budgetRules.id, { onDelete: 'set null', onUpdate: 'restrict' }),
  },
  (table) => [
    check('budgets_limit_amount_positive', sql`typeof(${table.limitAmount}) = 'integer' AND ${table.limitAmount} > 0 AND ${table.limitAmount} <= ${MAX_SAFE_MONEY_SQL}`),
    check('budgets_month_format', sql`${table.month} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' AND substr(${table.month}, 6, 2) BETWEEN '01' AND '12'`),
    check('budgets_color_valid', sql`${table.color} IS NULL OR ${table.color} IN ${BUDGET_COLORS_SQL}`),
    check('budgets_created_at_utc', sql`${table.createdAt} GLOB '????-??-??T??:??:??*Z'`),
    check('budgets_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
    uniqueIndex('budgets_category_month_uidx').on(table.categoryId, table.month),
    index('budgets_month_idx').on(table.month),
  ],
);

export const budgetRules = sqliteTable(
  'budget_rules',
  {
    id: text('id').primaryKey(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    limitAmount: integer('limit_amount').notNull(),
    color: text('color', { enum: BUDGET_COLORS_ENUM }),
    startMonth: text('start_month').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    ...auditColumns,
  },
  (table) => [
    check('budget_rules_limit_amount_positive', sql`typeof(${table.limitAmount}) = 'integer' AND ${table.limitAmount} > 0 AND ${table.limitAmount} <= ${MAX_SAFE_MONEY_SQL}`),
    check('budget_rules_color_valid', sql`${table.color} IS NULL OR ${table.color} IN ${BUDGET_COLORS_SQL}`),
    check('budget_rules_start_month_format', sql`${table.startMonth} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' AND substr(${table.startMonth}, 6, 2) BETWEEN '01' AND '12'`),
    check('budget_rules_is_active_valid', sql`${table.isActive} IN (0, 1)`),
    check('budget_rules_created_at_utc', sql`${table.createdAt} GLOB '????-??-??T??:??:??*Z'`),
    check('budget_rules_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
    uniqueIndex('budget_rules_active_category_uidx').on(table.categoryId).where(sql`${table.isActive} = 1`),
    index('budget_rules_active_start_idx').on(table.isActive, table.startMonth),
  ],
);

export const recurringTransactions = sqliteTable(
  'recurring_transactions',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['income', 'expense', 'transfer'] }).notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('COP'),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    destinationAccountId: text('destination_account_id').references(() => accounts.id, {
      onDelete: 'restrict',
      onUpdate: 'restrict',
    }),
    categoryId: text('category_id').references(() => categories.id, {
      onDelete: 'restrict',
      onUpdate: 'restrict',
    }),
    note: text('note'),
    frequency: text('frequency', { enum: ['daily', 'weekly', 'monthly', 'yearly'] }).notNull(),
    interval: integer('interval').notNull().default(1),
    startDate: text('start_date').notNull(),
    nextOccurrenceDate: text('next_occurrence_date').notNull(),
    endDate: text('end_date'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    endedAt: text('ended_at'),
    ...auditColumns,
    // Appended by migration 0013. Optional second classification level; its parent
    // must equal `category_id` (enforced by trigger). Transfers and refunds have a
    // NULL category, so the CHECK also keeps them free of a subcategory.
    subcategoryId: text('subcategory_id')
      .references((): AnySQLiteColumn => categories.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
  },
  (table) => [
    check('recurring_type_valid', sql`${table.type} IN ('income', 'expense', 'transfer')`),
    check('recurring_frequency_valid', sql`${table.frequency} IN ('daily', 'weekly', 'monthly', 'yearly')`),
    check('recurring_amount_positive', sql`typeof(${table.amount}) = 'integer' AND ${table.amount} > 0 AND ${table.amount} <= ${MAX_SAFE_MONEY_SQL}`),
    check('recurring_currency_supported', sql`${table.currency} IN ${SUPPORTED_CURRENCIES_SQL}`),
    check('recurring_interval_positive', sql`${table.interval} > 0`),
    check('recurring_start_date_valid', sql`${table.startDate} GLOB '????-??-??' AND date(${table.startDate}) = ${table.startDate}`),
    check('recurring_next_date_valid', sql`${table.nextOccurrenceDate} GLOB '????-??-??' AND date(${table.nextOccurrenceDate}) = ${table.nextOccurrenceDate}`),
    check('recurring_end_date_valid', sql`${table.endDate} IS NULL OR (${table.endDate} GLOB '????-??-??' AND date(${table.endDate}) = ${table.endDate} AND ${table.endDate} >= ${table.startDate})`),
    check('recurring_created_at_utc', sql`${table.createdAt} GLOB '????-??-??T??:??:??*Z'`),
    check('recurring_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
    check('recurring_ended_at_utc', sql`${table.endedAt} IS NULL OR ${table.endedAt} GLOB '????-??-??T??:??:??*Z'`),
    check(
      'recurring_shape_valid',
      sql`(
        (${table.type} IN ('income', 'expense') AND ${table.destinationAccountId} IS NULL AND ${table.categoryId} IS NOT NULL)
        OR
        (${table.type} = 'transfer' AND ${table.destinationAccountId} IS NOT NULL AND ${table.accountId} <> ${table.destinationAccountId} AND ${table.categoryId} IS NULL)
      )`,
    ),
    index('recurring_next_date_idx').on(table.isActive, table.nextOccurrenceDate),
    index('recurring_transactions_subcategory_idx').on(table.subcategoryId),
    check('recurring_subcategory_requires_category', sql`${table.subcategoryId} IS NULL OR ${table.categoryId} IS NOT NULL`),
  ],
);

export const recurringOccurrences = sqliteTable(
  'recurring_occurrences',
  {
    id: text('id').primaryKey(),
    recurringTransactionId: text('recurring_transaction_id')
      .notNull()
      .references(() => recurringTransactions.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    scheduledDate: text('scheduled_date').notNull(),
    status: text('status', { enum: ['pending', 'posted', 'skipped'] }).notNull().default('pending'),
    type: text('type', { enum: ['income', 'expense', 'transfer'] }).notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('COP'),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    destinationAccountId: text('destination_account_id').references(() => accounts.id, {
      onDelete: 'restrict',
      onUpdate: 'restrict',
    }),
    categoryId: text('category_id').references(() => categories.id, {
      onDelete: 'restrict',
      onUpdate: 'restrict',
    }),
    note: text('note'),
    transactionId: text('transaction_id').references(() => transactions.id, {
      onDelete: 'restrict',
      onUpdate: 'restrict',
    }),
    ...auditColumns,
    // Appended by migration 0013. Optional second classification level; its parent
    // must equal `category_id` (enforced by trigger). Transfers and refunds have a
    // NULL category, so the CHECK also keeps them free of a subcategory.
    subcategoryId: text('subcategory_id')
      .references((): AnySQLiteColumn => categories.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
  },
  (table) => [
    check('recurring_occurrence_status_valid', sql`${table.status} IN ('pending', 'posted', 'skipped')`),
    check('recurring_occurrence_type_valid', sql`${table.type} IN ('income', 'expense', 'transfer')`),
    check('recurring_occurrence_amount_positive', sql`typeof(${table.amount}) = 'integer' AND ${table.amount} > 0 AND ${table.amount} <= ${MAX_SAFE_MONEY_SQL}`),
    check('recurring_occurrence_currency_supported', sql`${table.currency} IN ${SUPPORTED_CURRENCIES_SQL}`),
    check('recurring_occurrence_date_valid', sql`${table.scheduledDate} GLOB '????-??-??' AND date(${table.scheduledDate}) = ${table.scheduledDate}`),
    check('recurring_occurrence_created_at_utc', sql`${table.createdAt} GLOB '????-??-??T??:??:??*Z'`),
    check('recurring_occurrence_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
    check(
      'recurring_occurrence_shape_valid',
      sql`(
        (${table.type} IN ('income', 'expense') AND ${table.destinationAccountId} IS NULL AND ${table.categoryId} IS NOT NULL)
        OR
        (${table.type} = 'transfer' AND ${table.destinationAccountId} IS NOT NULL AND ${table.accountId} <> ${table.destinationAccountId} AND ${table.categoryId} IS NULL)
      )`,
    ),
    check(
      'recurring_occurrence_transaction_link_valid',
      sql`(
        (${table.status} = 'posted' AND ${table.transactionId} IS NOT NULL)
        OR
        (${table.status} IN ('pending', 'skipped') AND ${table.transactionId} IS NULL)
      )`,
    ),
    uniqueIndex('recurring_occurrences_rule_date_uidx').on(
      table.recurringTransactionId,
      table.scheduledDate,
    ),
    uniqueIndex('recurring_occurrences_transaction_uidx').on(table.transactionId),
    index('recurring_occurrences_status_date_idx').on(table.status, table.scheduledDate),
    index('recurring_occurrences_rule_status_idx').on(table.recurringTransactionId, table.status),
    index('recurring_occurrences_account_idx').on(table.accountId),
    index('recurring_occurrences_destination_account_idx').on(table.destinationAccountId),
    index('recurring_occurrences_category_idx').on(table.categoryId),
    index('recurring_occurrences_subcategory_idx').on(table.subcategoryId),
    check('recurring_occurrences_subcategory_requires_category', sql`${table.subcategoryId} IS NULL OR ${table.categoryId} IS NOT NULL`),
  ],
);

export const notificationSettings = sqliteTable(
  'notification_settings',
  {
    id: text('id').primaryKey(),
    settingsVersion: integer('settings_version').notNull().default(1),
    notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' }).notNull().default(false),
    recurringRemindersEnabled: integer('recurring_reminders_enabled', { mode: 'boolean' }).notNull().default(false),
    recurringReminderTime: text('recurring_reminder_time').notNull().default('09:00'),
    recurringAdvanceDays: integer('recurring_advance_days').notNull().default(0),
    budgetAlertsEnabled: integer('budget_alerts_enabled', { mode: 'boolean' }).notNull().default(false),
    dailyReminderEnabled: integer('daily_reminder_enabled', { mode: 'boolean' }).notNull().default(false),
    dailyReminderTime: text('daily_reminder_time').notNull().default('19:00'),
    creditCardRemindersEnabled: integer('credit_card_reminders_enabled', { mode: 'boolean' }).notNull().default(false),
    creditCardClosingReminderEnabled: integer('credit_card_closing_reminder_enabled', { mode: 'boolean' }).notNull().default(true),
    creditCardDueThreeDaysEnabled: integer('credit_card_due_three_days_enabled', { mode: 'boolean' }).notNull().default(true),
    creditCardDueOneDayEnabled: integer('credit_card_due_one_day_enabled', { mode: 'boolean' }).notNull().default(true),
    creditCardDueTodayEnabled: integer('credit_card_due_today_enabled', { mode: 'boolean' }).notNull().default(true),
    notificationContentMode: text('notification_content_mode', { enum: ['private', 'detailed'] }).notNull().default('private'),
    permissionPrompted: integer('permission_prompted', { mode: 'boolean' }).notNull().default(false),
    lastErrorCode: text('last_error_code'),
    lastErrorAt: text('last_error_at'),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    check('notification_settings_singleton', sql`${table.id} = 'device'`),
    check('notification_settings_version_valid', sql`${table.settingsVersion} = 1`),
    check('notification_recurring_time_valid', sql`${table.recurringReminderTime} GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(${table.recurringReminderTime}, 1, 2) <= '23'`),
    check('notification_daily_time_valid', sql`${table.dailyReminderTime} GLOB '[0-2][0-9]:[0-5][0-9]' AND substr(${table.dailyReminderTime}, 1, 2) <= '23'`),
    check('notification_advance_days_valid', sql`${table.recurringAdvanceDays} BETWEEN 0 AND 3`),
    check('notification_content_mode_valid', sql`${table.notificationContentMode} IN ('private', 'detailed')`),
    check('notification_settings_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
    check('notification_settings_error_at_utc', sql`${table.lastErrorAt} IS NULL OR ${table.lastErrorAt} GLOB '????-??-??T??:??:??*Z'`),
  ],
);

export const scheduledNotifications = sqliteTable(
  'scheduled_notifications',
  {
    id: text('id').primaryKey(),
    domainType: text('domain_type', { enum: ['recurring-occurrence', 'daily-reminder', 'test-notification', 'credit-card-reminder'] }).notNull(),
    domainId: text('domain_id').notNull(),
    notificationKind: text('notification_kind').notNull(),
    scheduledNotificationId: text('scheduled_notification_id').notNull(),
    scheduledAt: text('scheduled_at').notNull(),
    triggerAt: text('trigger_at').notNull(),
    revision: text('revision').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    check('scheduled_notification_domain_valid', sql`${table.domainType} IN ('recurring-occurrence', 'daily-reminder', 'test-notification', 'credit-card-reminder')`),
    check('scheduled_notification_created_at_utc', sql`${table.createdAt} GLOB '????-??-??T??:??:??*Z'`),
    check('scheduled_notification_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
    check('scheduled_notification_scheduled_at_utc', sql`${table.scheduledAt} GLOB '????-??-??T??:??:??*Z'`),
    uniqueIndex('scheduled_notifications_domain_uidx').on(table.domainType, table.domainId, table.notificationKind),
    uniqueIndex('scheduled_notifications_native_id_uidx').on(table.scheduledNotificationId),
  ],
);

export const exchangeRates = sqliteTable(
  'exchange_rates',
  {
    // Singleton per currency pair, e.g. 'USD-COP'. v1 stores the USD/COP pair.
    id: text('id').primaryKey(),
    baseCurrencyCode: text('base_currency_code').notNull(),
    quoteCurrencyCode: text('quote_currency_code').notNull(),
    rateScaled: integer('rate_scaled').notNull(),
    rateScale: integer('rate_scale').notNull(),
    effectiveDate: text('effective_date').notNull(),
    fetchedAt: text('fetched_at').notNull(),
    provider: text('provider'),
    source: text('source').notNull(),
    ...auditColumns,
  },
  (table) => [
    check('exchange_rates_base_supported', sql`${table.baseCurrencyCode} IN ${SUPPORTED_CURRENCIES_SQL}`),
    check('exchange_rates_quote_supported', sql`${table.quoteCurrencyCode} IN ${SUPPORTED_CURRENCIES_SQL}`),
    check('exchange_rates_pair_distinct', sql`${table.baseCurrencyCode} <> ${table.quoteCurrencyCode}`),
    check('exchange_rates_scaled_valid', sql`typeof(${table.rateScaled}) = 'integer' AND ${table.rateScaled} > 0 AND ${table.rateScaled} <= ${MAX_SAFE_MONEY_SQL}`),
    check('exchange_rates_scale_valid', sql`typeof(${table.rateScale}) = 'integer' AND ${table.rateScale} > 0 AND ${table.rateScale} <= ${MAX_SAFE_MONEY_SQL}`),
    check('exchange_rates_effective_date_valid', sql`${table.effectiveDate} GLOB '????-??-??' AND date(${table.effectiveDate}) = ${table.effectiveDate}`),
    check('exchange_rates_fetched_at_utc', sql`${table.fetchedAt} GLOB '????-??-??T??:??:??*Z'`),
    check('exchange_rates_source_valid', sql`${table.source} IN ${VALUATION_RATE_SOURCES_SQL}`),
    check('exchange_rates_created_at_utc', sql`${table.createdAt} GLOB '????-??-??T??:??:??*Z'`),
    check('exchange_rates_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
  ],
);

// Investments v1: 1:1 metadata for accounts whose type is 'investment'.
export const investmentAccounts = sqliteTable(
  'investment_accounts',
  {
    // Primary key AND foreign key to the owning account (1:1).
    accountId: text('account_id')
      .primaryKey()
      .references(() => accounts.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    investmentType: text('investment_type', {
      enum: ['brokerage', 'fixed_term_deposit', 'voluntary_pension', 'investment_fund', 'private_investment', 'other'],
    }).notNull(),
    // v1 supports only 'balance' tracking; 'holdings' is reserved for v2.
    trackingMode: text('tracking_mode', { enum: ['balance'] }).notNull().default('balance'),
    liquidity: text('liquidity', { enum: ['liquid', 'restricted', 'locked'] }).notNull(),
    providerName: text('provider_name'),
    startDate: text('start_date'),
    maturityDate: text('maturity_date'),
    note: text('note'),
    ...auditColumns,
  },
  (table) => [
    check('investment_accounts_type_valid', sql`${table.investmentType} IN ${INVESTMENT_TYPES_SQL}`),
    check('investment_accounts_tracking_mode_valid', sql`${table.trackingMode} IN ${INVESTMENT_TRACKING_MODES_SQL}`),
    check('investment_accounts_liquidity_valid', sql`${table.liquidity} IN ${INVESTMENT_LIQUIDITY_SQL}`),
    check(
      'investment_accounts_start_date_valid',
      sql`${table.startDate} IS NULL OR (${table.startDate} GLOB '????-??-??' AND date(${table.startDate}) = ${table.startDate})`,
    ),
    check(
      'investment_accounts_maturity_date_valid',
      sql`${table.maturityDate} IS NULL OR (${table.maturityDate} GLOB '????-??-??' AND date(${table.maturityDate}) = ${table.maturityDate})`,
    ),
    // When both dates are present, maturity must not precede start.
    check(
      'investment_accounts_maturity_after_start',
      sql`${table.startDate} IS NULL OR ${table.maturityDate} IS NULL OR ${table.maturityDate} >= ${table.startDate}`,
    ),
    check('investment_accounts_created_at_utc', sql`${table.createdAt} GLOB '????-??-??T??:??:??*Z'`),
    check('investment_accounts_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
  ],
);

// Investments v1: manual market-value history per investment account.
export const investmentValuations = sqliteTable(
  'investment_valuations',
  {
    id: text('id').primaryKey(),
    investmentAccountId: text('investment_account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict', onUpdate: 'restrict' }),
    // Total market value the user reads from their statement, in the account's
    // native currency minor units.
    valueMinor: integer('value_minor').notNull(),
    // Snapshot of the account's net contributions (derived ledger balance) at
    // record time. currentValue = netContributions(now) + (value - basis).
    basisMinor: integer('basis_minor').notNull(),
    currencyCode: text('currency_code').notNull(),
    valuationDate: text('valuation_date').notNull(),
    note: text('note'),
    ...auditColumns,
  },
  (table) => [
    check(
      'investment_valuations_value_safe',
      sql`typeof(${table.valueMinor}) = 'integer' AND ${table.valueMinor} >= 0 AND ${table.valueMinor} <= ${MAX_SAFE_MONEY_SQL}`,
    ),
    // Net contributions may be negative when withdrawals exceed contributions.
    check(
      'investment_valuations_basis_safe',
      sql`typeof(${table.basisMinor}) = 'integer' AND ${table.basisMinor} BETWEEN ${MIN_SAFE_MONEY_SQL} AND ${MAX_SAFE_MONEY_SQL}`,
    ),
    check('investment_valuations_currency_supported', sql`${table.currencyCode} IN ${SUPPORTED_CURRENCIES_SQL}`),
    check(
      'investment_valuations_date_valid',
      sql`${table.valuationDate} GLOB '????-??-??' AND date(${table.valuationDate}) = ${table.valuationDate}`,
    ),
    check('investment_valuations_created_at_utc', sql`${table.createdAt} GLOB '????-??-??T??:??:??*Z'`),
    check('investment_valuations_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
    // One valuation per account per date; also serves latest-valuation lookups
    // (WHERE investment_account_id = ? ORDER BY valuation_date DESC).
    uniqueIndex('investment_valuations_account_date_uidx').on(table.investmentAccountId, table.valuationDate),
  ],
);

export const budgetNotificationState = sqliteTable(
  'budget_notification_state',
  {
    budgetId: text('budget_id').notNull(),
    month: text('month').notNull(),
    threshold80Notified: integer('threshold_80_notified', { mode: 'boolean' }).notNull().default(false),
    threshold100Notified: integer('threshold_100_notified', { mode: 'boolean' }).notNull().default(false),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.budgetId, table.month] }),
    check('budget_notification_month_valid', sql`${table.month} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' AND substr(${table.month}, 6, 2) BETWEEN '01' AND '12'`),
    check('budget_notification_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
  ],
);
