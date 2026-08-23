import { and, eq, isNull, ne, or, sql } from 'drizzle-orm';

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
  async listSubcategories(parentCategoryId: string, includeArchived: boolean): Promise<Category[]> {
    const conditions = [eq(categories.parentCategoryId, parentCategoryId)];
    if (!includeArchived) conditions.push(eq(categories.isArchived, false));
    const rows = await database.select().from(categories).where(and(...conditions)).orderBy(categories.isArchived, categories.name);
    return rows.map(mapCategory);
  }
  async hasSubcategories(id: string): Promise<boolean> {
    const [row] = await database.select({ id: categories.id }).from(categories).where(eq(categories.parentCategoryId, id)).limit(1);
    return Boolean(row);
  }
  async findById(id: string): Promise<Category | null> { const row = await database.query.categories.findFirst({ where: eq(categories.id, id) }); return row ? mapCategory(row) : null; }
  async findActiveByNormalizedName(type: CategoryType, parentCategoryId: string | null, name: string, excludingId?: string): Promise<Category | null> {
    const conditions = [
      eq(categories.type, type),
      eq(categories.isArchived, false),
      parentCategoryId === null ? isNull(categories.parentCategoryId) : eq(categories.parentCategoryId, parentCategoryId),
      sql`lower(trim(${categories.name})) = ${name}`,
    ];
    if (excludingId) conditions.push(ne(categories.id, excludingId));
    const [row] = await database.select().from(categories).where(and(...conditions)).limit(1);
    return row ? mapCategory(row) : null;
  }
  async hasFinancialReferences(id: string): Promise<boolean> {
    // Each financial table is checked on BOTH classification columns: a category
    // used only as a subcategory is just as referenced as one used as the parent,
    // and missing that would allow permanently deleting a subcategory in use.
    const [transaction, budget, recurring, occurrence] = await Promise.all([
      database.select({ id: transactions.id }).from(transactions).where(or(eq(transactions.categoryId, id), eq(transactions.subcategoryId, id))).limit(1),
      database.select({ id: budgets.id }).from(budgets).where(eq(budgets.categoryId, id)).limit(1),
      database.select({ id: recurringTransactions.id }).from(recurringTransactions).where(or(eq(recurringTransactions.categoryId, id), eq(recurringTransactions.subcategoryId, id))).limit(1),
      database.select({ id: recurringOccurrences.id }).from(recurringOccurrences).where(or(eq(recurringOccurrences.categoryId, id), eq(recurringOccurrences.subcategoryId, id))).limit(1),
    ]);
    return Boolean(transaction[0] || budget[0] || recurring[0] || occurrence[0]);
  }
  async create(category: Category): Promise<void> { await database.insert(categories).values(category); }
  async update(id: string, update: CategoryUpdate): Promise<void> { await database.update(categories).set(update).where(eq(categories.id, id)); }
  async archiveWithSubcategories(id: string, timestamp: string): Promise<void> {
    // One transaction: an active subcategory under an archived parent is a state
    // the pickers cannot represent.
    await database.transaction(async (tx) => {
      const archived = { isArchived: true, archivedAt: timestamp, updatedAt: timestamp };
      await tx.update(categories).set(archived).where(eq(categories.parentCategoryId, id));
      await tx.update(categories).set(archived).where(eq(categories.id, id));
    });
  }
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
