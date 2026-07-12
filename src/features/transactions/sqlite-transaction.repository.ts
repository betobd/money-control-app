import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';

import { database } from '@/database/client';
import { accounts, categories, transactions } from '@/database/schema';
import type { TransactionRepository } from './transaction.repository';
import type {
  MonthlyTransactionSummary,
  SupportedTransactionType,
  TransactionListItem,
  TransactionRecord,
  TransactionUpdateRecord,
} from './transaction.types';

const destinationAccounts = alias(accounts, 'destination_accounts');
const selection = {
  transaction: transactions,
  accountName: accounts.name,
  destinationAccountName: destinationAccounts.name,
  categoryName: categories.name,
  categoryIcon: categories.icon,
};

type TransactionRow = {
  transaction: typeof transactions.$inferSelect;
  accountName: string;
  destinationAccountName: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
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
  };
}

export class SQLiteTransactionRepository implements TransactionRepository {
  async create(transaction: TransactionRecord): Promise<void> {
    await database.insert(transactions).values(transaction);
  }

  async findById(id: string): Promise<TransactionListItem | null> {
    const rows = await this.historyQuery(eq(transactions.id, id), 1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async list(): Promise<TransactionListItem[]> {
    const rows = await this.historyQuery();
    return rows.map(mapRow);
  }

  async recent(limit: number): Promise<TransactionListItem[]> {
    const rows = await this.historyQuery(eq(transactions.status, 'posted'), limit);
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
        expenses: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
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
    const expenses = Number(row.expenses);
    return { income, expenses, net: income - expenses };
  }

  async updatePosted(id: string, transaction: TransactionUpdateRecord): Promise<boolean> {
    const rows = await database
      .update(transactions)
      .set(transaction)
      .where(and(eq(transactions.id, id), eq(transactions.status, 'posted')))
      .returning({ id: transactions.id });
    return rows.length === 1;
  }

  async voidPosted(id: string, updatedAt: string): Promise<boolean> {
    const rows = await database
      .update(transactions)
      .set({ status: 'voided', updatedAt })
      .where(and(eq(transactions.id, id), eq(transactions.status, 'posted')))
      .returning({ id: transactions.id });
    return rows.length === 1;
  }

  private historyQuery(status?: ReturnType<typeof eq>, limit?: number) {
    const query = database
      .select(selection)
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(destinationAccounts, eq(transactions.destinationAccountId, destinationAccounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(status)
      .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt));

    return limit === undefined ? query : query.limit(limit);
  }
}
