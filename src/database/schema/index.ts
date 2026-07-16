import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const MAX_SAFE_MONEY = 9_007_199_254_740_991;
const MAX_SAFE_MONEY_SQL = sql.raw(String(MAX_SAFE_MONEY));
const MIN_SAFE_MONEY_SQL = sql.raw(String(-MAX_SAFE_MONEY));
const auditColumns = {
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
};

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type', { enum: ['checking', 'savings', 'credit_card', 'cash', 'other'] }).notNull(),
    currency: text('currency').notNull().default('COP'),
    openingBalance: integer('opening_balance').notNull().default(0),
    creditLimit: integer('credit_limit'),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    archivedAt: text('archived_at'),
    ...auditColumns,
  },
  (table) => [
    check('accounts_name_not_empty', sql`length(trim(${table.name})) > 0`),
    check('accounts_currency_cop', sql`${table.currency} = 'COP'`),
    check('accounts_type_valid', sql`${table.type} IN ('checking', 'savings', 'credit_card', 'cash', 'other')`),
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
    index('accounts_archived_idx').on(table.isArchived),
    uniqueIndex('accounts_active_name_uidx')
      .on(sql`lower(trim(${table.name}))`)
      .where(sql`${table.isArchived} = 0`),
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
  },
  (table) => [
    check('categories_name_not_empty', sql`length(trim(${table.name})) > 0`),
    check('categories_type_valid', sql`${table.type} IN ('expense', 'income')`),
    check('categories_created_at_utc', sql`${table.createdAt} GLOB '????-??-??T??:??:??*Z'`),
    check('categories_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
    check('categories_archived_at_utc', sql`${table.archivedAt} IS NULL OR ${table.archivedAt} GLOB '????-??-??T??:??:??*Z'`),
    index('categories_archived_idx').on(table.isArchived),
    index('categories_type_idx').on(table.type),
    uniqueIndex('categories_active_type_name_uidx')
      .on(table.type, sql`lower(trim(${table.name}))`)
      .where(sql`${table.isArchived} = 0`),
  ],
);

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['income', 'expense', 'transfer'] }).notNull(),
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
    note: text('note'),
    transactionDate: text('transaction_date').notNull(),
    ...auditColumns,
  },
  (table) => [
    check('transactions_type_valid', sql`${table.type} IN ('income', 'expense', 'transfer')`),
    check('transactions_status_valid', sql`${table.status} IN ('posted', 'voided')`),
    check('transactions_amount_positive', sql`typeof(${table.amount}) = 'integer' AND ${table.amount} > 0 AND ${table.amount} <= ${MAX_SAFE_MONEY_SQL}`),
    check('transactions_currency_cop', sql`${table.currency} = 'COP'`),
    check(
      'transactions_date_valid',
      sql`${table.transactionDate} GLOB '????-??-??' AND date(${table.transactionDate}) = ${table.transactionDate}`,
    ),
    check('transactions_created_at_utc', sql`${table.createdAt} GLOB '????-??-??T??:??:??*Z'`),
    check('transactions_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
    check(
      'transactions_shape_valid',
      sql`(
        (${table.type} IN ('income', 'expense') AND ${table.accountId} IS NOT NULL AND ${table.destinationAccountId} IS NULL AND ${table.categoryId} IS NOT NULL)
        OR
        (${table.type} = 'transfer' AND ${table.accountId} IS NOT NULL AND ${table.destinationAccountId} IS NOT NULL AND ${table.accountId} <> ${table.destinationAccountId} AND ${table.categoryId} IS NULL)
      )`,
    ),
    index('transactions_date_idx').on(table.transactionDate),
    index('transactions_type_date_idx').on(table.type, table.transactionDate),
    index('transactions_account_idx').on(table.accountId),
    index('transactions_destination_account_idx').on(table.destinationAccountId),
    index('transactions_category_idx').on(table.categoryId),
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
  },
  (table) => [
    check('budgets_limit_amount_positive', sql`typeof(${table.limitAmount}) = 'integer' AND ${table.limitAmount} > 0 AND ${table.limitAmount} <= ${MAX_SAFE_MONEY_SQL}`),
    check('budgets_month_format', sql`${table.month} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]' AND substr(${table.month}, 6, 2) BETWEEN '01' AND '12'`),
    check('budgets_created_at_utc', sql`${table.createdAt} GLOB '????-??-??T??:??:??*Z'`),
    check('budgets_updated_at_utc', sql`${table.updatedAt} GLOB '????-??-??T??:??:??*Z'`),
    uniqueIndex('budgets_category_month_uidx').on(table.categoryId, table.month),
    index('budgets_month_idx').on(table.month),
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
  },
  (table) => [
    check('recurring_type_valid', sql`${table.type} IN ('income', 'expense', 'transfer')`),
    check('recurring_frequency_valid', sql`${table.frequency} IN ('daily', 'weekly', 'monthly', 'yearly')`),
    check('recurring_amount_positive', sql`typeof(${table.amount}) = 'integer' AND ${table.amount} > 0 AND ${table.amount} <= ${MAX_SAFE_MONEY_SQL}`),
    check('recurring_currency_cop', sql`${table.currency} = 'COP'`),
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
  },
  (table) => [
    check('recurring_occurrence_status_valid', sql`${table.status} IN ('pending', 'posted', 'skipped')`),
    check('recurring_occurrence_type_valid', sql`${table.type} IN ('income', 'expense', 'transfer')`),
    check('recurring_occurrence_amount_positive', sql`typeof(${table.amount}) = 'integer' AND ${table.amount} > 0 AND ${table.amount} <= ${MAX_SAFE_MONEY_SQL}`),
    check('recurring_occurrence_currency_cop', sql`${table.currency} = 'COP'`),
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
  ],
);
