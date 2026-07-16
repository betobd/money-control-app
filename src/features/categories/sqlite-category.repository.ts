import { and, eq, ne, sql } from 'drizzle-orm';

import { database } from '@/database/client';
import {
  budgets,
  categories,
  recurringOccurrences,
  recurringTransactions,
  transactions,
} from '@/database/schema';
import type { CategoryRepository, CategoryUpdate } from './category.repository';
import type { Category, CategoryType } from './category.types';

type CategoryRow = typeof categories.$inferSelect;
function mapCategory(row: CategoryRow): Category { return { ...row, type: row.type as CategoryType, icon: row.icon ?? 'other' }; }

export class SQLiteCategoryRepository implements CategoryRepository {
  async list(type: CategoryType, includeArchived: boolean): Promise<Category[]> {
    const rows = await database.select().from(categories).where(and(eq(categories.type, type), includeArchived ? undefined : eq(categories.isArchived, false))).orderBy(categories.isArchived, categories.name);
    return rows.map(mapCategory);
  }
  async findById(id: string): Promise<Category | null> { const row = await database.query.categories.findFirst({ where: eq(categories.id, id) }); return row ? mapCategory(row) : null; }
  async findActiveByNormalizedName(type: CategoryType, name: string, excludingId?: string): Promise<Category | null> {
    const conditions = [eq(categories.type, type), eq(categories.isArchived, false), sql`lower(trim(${categories.name})) = ${name}`];
    if (excludingId) conditions.push(ne(categories.id, excludingId));
    const [row] = await database.select().from(categories).where(and(...conditions)).limit(1);
    return row ? mapCategory(row) : null;
  }
  async hasFinancialReferences(id: string): Promise<boolean> {
    const [transaction, budget, recurring, occurrence] = await Promise.all([
      database.select({ id: transactions.id }).from(transactions).where(eq(transactions.categoryId, id)).limit(1),
      database.select({ id: budgets.id }).from(budgets).where(eq(budgets.categoryId, id)).limit(1),
      database.select({ id: recurringTransactions.id }).from(recurringTransactions).where(eq(recurringTransactions.categoryId, id)).limit(1),
      database.select({ id: recurringOccurrences.id }).from(recurringOccurrences).where(eq(recurringOccurrences.categoryId, id)).limit(1),
    ]);
    return Boolean(transaction[0] || budget[0] || recurring[0] || occurrence[0]);
  }
  async create(category: Category): Promise<void> { await database.insert(categories).values(category); }
  async update(id: string, update: CategoryUpdate): Promise<void> { await database.update(categories).set(update).where(eq(categories.id, id)); }
  async archive(id: string, timestamp: string): Promise<void> { await database.update(categories).set({ isArchived: true, archivedAt: timestamp, updatedAt: timestamp }).where(eq(categories.id, id)); }
  async restore(id: string, timestamp: string): Promise<void> { await database.update(categories).set({ isArchived: false, archivedAt: null, updatedAt: timestamp }).where(eq(categories.id, id)); }
  async permanentlyDelete(id: string): Promise<void> { await database.delete(categories).where(eq(categories.id, id)); }
  async seedIfEmpty(seedCategories: Category[]): Promise<boolean> {
    return database.transaction(async (tx) => {
      const [result] = await tx.select({ count: sql<number>`count(*)` }).from(categories);
      if (Number(result.count) !== 0) return false;
      await tx.insert(categories).values(seedCategories);
      return true;
    });
  }
}
