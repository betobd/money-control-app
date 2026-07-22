import { and, asc, eq, gte, lt, ne, sql } from 'drizzle-orm';

import { database } from '@/database/client';
import { budgets, categories, transactions } from '@/database/schema';
import { nextBudgetMonth } from './budget-month';
import type { BudgetRepository, BudgetUpdateRecord } from './budget.repository';
import type { Budget, BudgetRecord, BudgetSpendingRecord } from './budget.types';

const recordSelection = {
  budget: budgets,
  categoryName: categories.name,
  categoryIcon: categories.icon,
  categoryIsArchived: categories.isArchived,
};

type RecordRow = {
  budget: typeof budgets.$inferSelect;
  categoryName: string;
  categoryIcon: string | null;
  categoryIsArchived: boolean;
};

function mapRecord(row: RecordRow): BudgetRecord {
  return {
    ...row.budget,
    categoryName: row.categoryName,
    categoryIcon: row.categoryIcon ?? 'other',
    categoryIsArchived: row.categoryIsArchived,
  };
}

export class SQLiteBudgetRepository implements BudgetRepository {
  async create(budget: Budget): Promise<void> {
    await database.insert(budgets).values(budget);
  }

  async findById(id: string): Promise<BudgetRecord | null> {
    const [row] = await database
      .select(recordSelection)
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .where(eq(budgets.id, id))
      .limit(1);
    return row ? mapRecord(row) : null;
  }

  async findDuplicate(categoryId: string, month: string, excludingId?: string): Promise<BudgetRecord | null> {
    const conditions = [eq(budgets.categoryId, categoryId), eq(budgets.month, month)];
    if (excludingId) conditions.push(ne(budgets.id, excludingId));
    const [row] = await database
      .select(recordSelection)
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .where(and(...conditions))
      .limit(1);
    return row ? mapRecord(row) : null;
  }

  async listMonth(month: string): Promise<BudgetSpendingRecord[]> {
    const start = `${month}-01`;
    const next = `${nextBudgetMonth(month)}-01`;
    const rows = await database
      .select({
        ...recordSelection,
        spent: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .leftJoin(
        transactions,
        and(
          eq(transactions.categoryId, budgets.categoryId),
          eq(transactions.type, 'expense'),
          eq(transactions.status, 'posted'),
          gte(transactions.transactionDate, start),
          lt(transactions.transactionDate, next),
        ),
      )
      .where(eq(budgets.month, month))
      .groupBy(budgets.id, categories.id)
      .orderBy(asc(categories.name), asc(budgets.createdAt));

    return rows.map((row) => ({ ...mapRecord(row), spent: Number(row.spent) }));
  }

  async listAll(): Promise<BudgetSpendingRecord[]> {
    const rows = await database
      .select({
        ...recordSelection,
        spent: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .leftJoin(
        transactions,
        and(
          eq(transactions.categoryId, budgets.categoryId),
          eq(transactions.type, 'expense'),
          eq(transactions.status, 'posted'),
          gte(transactions.transactionDate, sql<string>`${budgets.month} || '-01'`),
          lt(transactions.transactionDate, sql<string>`date(${budgets.month} || '-01', '+1 month')`),
        ),
      )
      .groupBy(budgets.id, categories.id)
      .orderBy(asc(budgets.month), asc(categories.name), asc(budgets.createdAt));
    return rows.map((row) => ({ ...mapRecord(row), spent: Number(row.spent) }));
  }

  async update(id: string, budget: BudgetUpdateRecord): Promise<void> {
    await database.update(budgets).set(budget).where(eq(budgets.id, id));
  }

  async remove(id: string): Promise<void> {
    await database.delete(budgets).where(eq(budgets.id, id));
  }
}
