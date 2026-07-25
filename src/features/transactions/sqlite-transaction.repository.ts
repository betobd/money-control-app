import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lte,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';

import { database } from '@/database/client';
import { accounts, categories, transactions } from '@/database/schema';
import type { TransactionRepository } from './transaction.repository';
import type {
  MonthlyTransactionSummary,
  NormalizedTransactionListQuery,
  SupportedTransactionType,
  TransactionFilterCategory,
  TransactionFilterOptions,
  TransactionListItem,
  TransactionListPage,
  TransactionRecord,
  TransactionUpdateRecord,
} from './transaction.types';

const destinationAccounts = alias(accounts, 'destination_accounts');
const originalTransactions = alias(transactions, 'original_transactions');
const originalCategories = alias(categories, 'original_categories');
const selection = {
  transaction: transactions,
  accountName: accounts.name,
  destinationAccountName: destinationAccounts.name,
  categoryName: sql<string | null>`coalesce(${categories.name}, ${originalCategories.name})`,
  categoryIcon: sql<string | null>`coalesce(${categories.icon}, ${originalCategories.icon})`,
  originalTransactionDate: originalTransactions.transactionDate,
  originalTransactionNote: originalTransactions.note,
};

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

type TransactionRow = {
  transaction: typeof transactions.$inferSelect;
  accountName: string;
  destinationAccountName: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  originalTransactionDate: string | null;
  originalTransactionNote: string | null;
};

function mapRow(row: TransactionRow): TransactionListItem {
  const transaction = {
    ...row.transaction,
    type: row.transaction.type as SupportedTransactionType,
    status: row.transaction.status as 'posted' | 'voided',
    accountId: row.transaction.accountId!,
    note: row.transaction.note,
    currency: 'COP' as const,
  } as TransactionRecord;

  return {
    ...transaction,
    accountName: row.accountName,
    destinationAccountName: row.destinationAccountName,
    categoryName: row.categoryName,
    categoryIcon: row.categoryIcon,
    originalTransactionDate: row.originalTransactionDate,
    originalTransactionNote: row.originalTransactionNote,
  };
}

export class SQLiteTransactionRepository implements TransactionRepository {
  async create(transaction: TransactionRecord): Promise<void> {
    await database.insert(transactions).values(transaction);
  }

  async findById(id: string): Promise<TransactionListItem | null> {
    const rows = await this.historyQuery([eq(transactions.id, id)], 1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async hasAny(): Promise<boolean> {
    const [row] = await database.select({ id: transactions.id }).from(transactions).limit(1);
    return Boolean(row);
  }

  async list(query: NormalizedTransactionListQuery): Promise<TransactionListPage> {
    const conditions = this.listConditions(query);
    const rows = await this.historyQuery(conditions, query.limit + 1);
    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit).map(mapRow);
    const last = items.at(-1);

    return {
      items,
      nextCursor: hasMore && last
        ? {
            transactionDate: last.transactionDate,
            createdAt: last.createdAt,
            id: last.id,
          }
        : null,
    };
  }

  async listFilterOptions(): Promise<TransactionFilterOptions> {
    const [accountRows, categoryRows] = await Promise.all([
      database
        .select({ id: accounts.id, name: accounts.name, isArchived: accounts.isArchived })
        .from(accounts)
        .where(or(
          eq(accounts.isArchived, false),
          sql<boolean>`exists (
            select 1 from ${transactions}
            where ${transactions.accountId} = ${accounts.id}
               or ${transactions.destinationAccountId} = ${accounts.id}
          )`,
        ))
        .orderBy(asc(accounts.isArchived), sql`lower(${accounts.name})`, asc(accounts.id)),
      database
        .select({
          id: categories.id,
          name: categories.name,
          isArchived: categories.isArchived,
          type: categories.type,
        })
        .from(categories)
        .where(or(
          eq(categories.isArchived, false),
          sql<boolean>`exists (
            select 1 from ${transactions}
            where ${transactions.categoryId} = ${categories.id}
          )`,
        ))
        .orderBy(asc(categories.type), asc(categories.isArchived), sql`lower(${categories.name})`, asc(categories.id)),
    ]);

    return {
      accounts: accountRows,
      categories: categoryRows.map((category) => ({
        ...category,
        type: category.type as TransactionFilterCategory['type'],
      })),
    };
  }

  async recent(limit: number): Promise<TransactionListItem[]> {
    const rows = await this.historyQuery([eq(transactions.status, 'posted')], limit);
    return rows.map(mapRow);
  }

  async summarizeMonth(month: string): Promise<MonthlyTransactionSummary> {
    const start = `${month}-01`;
    const [year, monthNumber] = month.split('-').map(Number);
    const next = monthNumber === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(monthNumber + 1).padStart(2, '0')}-01`;
    const [row] = await database
      .select({
        income: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
        grossExpenses: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
        refunds: sql<number>`coalesce(sum(case when ${transactions.type} = 'refund' then ${transactions.amount} else 0 end), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.status, 'posted'),
          gte(transactions.transactionDate, start),
          lt(transactions.transactionDate, next),
        ),
      );
    const income = Number(row.income);
    const grossExpenses = Number(row.grossExpenses);
    const refunds = Number(row.refunds);
    const netExpenses = grossExpenses - refunds;
    return { income, grossExpenses, refunds, netExpenses, net: income - netExpenses };
  }

  async hasPostedRefunds(id: string): Promise<boolean> {
    const [row] = await database
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(
        eq(transactions.type, 'refund'),
        eq(transactions.status, 'posted'),
        eq(transactions.originalTransactionId, id),
      ))
      .limit(1);
    return Boolean(row);
  }

  async updatePosted(id: string, transaction: TransactionUpdateRecord): Promise<boolean> {
    const rows = await database
      .update(transactions)
      .set(transaction)
      .where(and(
        eq(transactions.id, id),
        eq(transactions.status, 'posted'),
        sql<boolean>`not exists (
          select 1 from transactions linked_refunds
          where linked_refunds.original_transaction_id = ${transactions.id}
            and linked_refunds.type = 'refund'
            and linked_refunds.status = 'posted'
        )`,
      ))
      .returning({ id: transactions.id });
    return rows.length === 1;
  }

  async voidPosted(id: string, updatedAt: string): Promise<boolean> {
    const rows = await database
      .update(transactions)
      .set({ status: 'voided', updatedAt })
      .where(and(
        eq(transactions.id, id),
        eq(transactions.status, 'posted'),
        sql<boolean>`not exists (
          select 1 from transactions linked_refunds
          where linked_refunds.original_transaction_id = ${transactions.id}
            and linked_refunds.type = 'refund'
            and linked_refunds.status = 'posted'
        )`,
      ))
      .returning({ id: transactions.id });
    return rows.length === 1;
  }

  private listConditions(query: NormalizedTransactionListQuery): SQL[] {
    const conditions: SQL[] = [];
    if (query.search) {
      const pattern = `%${escapeLikePattern(query.search.toLocaleLowerCase('en-US'))}%`;
      conditions.push(or(
        sql<boolean>`lower(coalesce(${transactions.note}, '')) like ${pattern} escape '\\'`,
        sql<boolean>`lower(${accounts.name}) like ${pattern} escape '\\'`,
        sql<boolean>`lower(coalesce(${destinationAccounts.name}, '')) like ${pattern} escape '\\'`,
        sql<boolean>`lower(coalesce(${categories.name}, '')) like ${pattern} escape '\\'`,
        sql<boolean>`lower(coalesce(${originalCategories.name}, '')) like ${pattern} escape '\\'`,
        sql<boolean>`lower(coalesce(${originalTransactions.note}, '')) like ${pattern} escape '\\'`,
        sql<boolean>`lower(${transactions.type}) like ${pattern} escape '\\'`,
      )!);
    }
    if (query.types?.length) conditions.push(inArray(transactions.type, query.types));
    if (query.statuses?.length) conditions.push(inArray(transactions.status, query.statuses));
    if (query.accountId) {
      conditions.push(or(
        eq(transactions.accountId, query.accountId),
        eq(transactions.destinationAccountId, query.accountId),
      )!);
    }
    if (query.categoryId) {
      conditions.push(or(
        eq(transactions.categoryId, query.categoryId),
        and(
          eq(transactions.type, 'refund'),
          eq(originalTransactions.categoryId, query.categoryId),
        ),
      )!);
    }
    if (query.originalTransactionId) {
      conditions.push(eq(transactions.originalTransactionId, query.originalTransactionId));
    }
    if (query.dateFrom) conditions.push(gte(transactions.transactionDate, query.dateFrom));
    if (query.dateTo) conditions.push(lte(transactions.transactionDate, query.dateTo));
    if (query.cursor) {
      conditions.push(or(
        lt(transactions.transactionDate, query.cursor.transactionDate),
        and(
          eq(transactions.transactionDate, query.cursor.transactionDate),
          lt(transactions.createdAt, query.cursor.createdAt),
        ),
        and(
          eq(transactions.transactionDate, query.cursor.transactionDate),
          eq(transactions.createdAt, query.cursor.createdAt),
          lt(transactions.id, query.cursor.id),
        ),
      )!);
    }
    return conditions;
  }

  private historyQuery(conditions: SQL[] = [], limit?: number) {
    const query = database
      .select(selection)
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(destinationAccounts, eq(transactions.destinationAccountId, destinationAccounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(originalTransactions, eq(transactions.originalTransactionId, originalTransactions.id))
      .leftJoin(originalCategories, eq(originalTransactions.categoryId, originalCategories.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(
        desc(transactions.transactionDate),
        desc(transactions.createdAt),
        desc(transactions.id),
      );

    return limit === undefined ? query : query.limit(limit);
  }
}
