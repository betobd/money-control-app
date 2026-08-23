import { and, asc, eq, gte, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';

import { database } from '@/database/client';
import { budgets, categories } from '@/database/schema';
import { nextBudgetMonth } from './budget-month';
import type { BudgetInstancePatch, BudgetRepository, BudgetUpdateRecord } from './budget.repository';
import type { Budget, BudgetRecord, BudgetSpendingRecord } from './budget.types';

const parentCategories = alias(categories, 'budget_parent_categories');

const recordSelection = {
  budget: budgets,
  categoryName: categories.name,
  categoryIcon: categories.icon,
  categoryIsArchived: categories.isArchived,
  categoryParentId: categories.parentCategoryId,
  categoryParentName: parentCategories.name,
};

/**
 * Spending attributed to one budget's node.
 *
 * A budget may name a top-level category or a subcategory. The single equality
 * per level is unambiguous because a parent id can never appear in
 * `subcategory_id` and a leaf id can never appear in `category_id`: a budget on
 * a parent therefore covers its whole subtree (category_id always holds the
 * parent), and a budget on a leaf covers only that leaf. Refunds resolve through
 * the expense they refund, at both levels.
 */
function spendingFor(from: unknown, to: unknown) {
  return sql<number>`(
    select coalesce(sum(
      case
        when refund_rows.type = 'expense' then coalesce(refund_rows.base_amount_minor, refund_rows.amount)
        when refund_rows.type = 'refund' then -coalesce(refund_rows.base_amount_minor, refund_rows.amount)
        else 0
      end
    ), 0)
    from transactions refund_rows
    left join transactions original_rows
      on refund_rows.original_transaction_id = original_rows.id
    where refund_rows.status = 'posted'
      and refund_rows.transaction_date >= ${from}
      and refund_rows.transaction_date < ${to}
      and (
        coalesce(refund_rows.category_id, original_rows.category_id) = ${budgets.categoryId}
        or coalesce(refund_rows.subcategory_id, original_rows.subcategory_id) = ${budgets.categoryId}
      )
  )`;
}

type RecordRow = {
  budget: typeof budgets.$inferSelect;
  categoryName: string;
  categoryIcon: string | null;
  categoryIsArchived: boolean;
  categoryParentId: string | null;
  categoryParentName: string | null;
};

function mapRecord(row: RecordRow): BudgetRecord {
  return {
    ...row.budget,
    categoryName: row.categoryName,
    categoryIcon: row.categoryIcon ?? 'other',
    categoryIsArchived: row.categoryIsArchived,
    categoryParentId: row.categoryParentId,
    categoryParentName: row.categoryParentName,
  };
}

export class SQLiteBudgetRepository implements BudgetRepository {
  async create(budget: Budget): Promise<void> {
    await database.insert(budgets).values(budget);
  }

  async materialize(budget: Budget): Promise<void> {
    await database.insert(budgets).values(budget).onConflictDoNothing();
  }

  async findById(id: string): Promise<BudgetRecord | null> {
    const [row] = await database
      .select(recordSelection)
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .leftJoin(parentCategories, eq(categories.parentCategoryId, parentCategories.id))
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
      .leftJoin(parentCategories, eq(categories.parentCategoryId, parentCategories.id))
      .where(and(...conditions))
      .limit(1);
    return row ? mapRecord(row) : null;
  }

  async listMonth(month: string): Promise<BudgetSpendingRecord[]> {
    const start = `${month}-01`;
    const next = `${nextBudgetMonth(month)}-01`;
    const rows = await database
      .select({ ...recordSelection, spent: spendingFor(start, next) })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .leftJoin(parentCategories, eq(categories.parentCategoryId, parentCategories.id))
      .where(eq(budgets.month, month))
      // Ordered by the parent's name first, so a subcategory budget sits next to
      // the category it belongs to rather than alphabetically elsewhere.
      .orderBy(
        asc(sql`coalesce(${parentCategories.name}, ${categories.name})`),
        asc(categories.parentCategoryId),
        asc(categories.name),
        asc(budgets.createdAt),
      );

    return rows.map((row) => ({ ...mapRecord(row), spent: Number(row.spent) }));
  }

  async listAll(): Promise<BudgetSpendingRecord[]> {
    const rows = await database
      .select({
        ...recordSelection,
        spent: spendingFor(sql`${budgets.month} || '-01'`, sql`date(${budgets.month} || '-01', '+1 month')`),
      })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .leftJoin(parentCategories, eq(categories.parentCategoryId, parentCategories.id))
      .orderBy(asc(budgets.month), asc(categories.name), asc(budgets.createdAt));
    return rows.map((row) => ({ ...mapRecord(row), spent: Number(row.spent) }));
  }

  async update(id: string, budget: BudgetUpdateRecord): Promise<void> {
    await database.update(budgets).set(budget).where(eq(budgets.id, id));
  }

  async updateForRuleFromMonth(ruleId: string, month: string, patch: BudgetInstancePatch): Promise<void> {
    await database
      .update(budgets)
      .set({ limitAmount: patch.limitAmount, color: patch.color, updatedAt: patch.updatedAt })
      .where(and(eq(budgets.ruleId, ruleId), gte(budgets.month, month)));
  }

  async deleteForRuleFromMonth(ruleId: string, month: string): Promise<void> {
    await database.delete(budgets).where(and(eq(budgets.ruleId, ruleId), gte(budgets.month, month)));
  }

  async remove(id: string): Promise<void> {
    await database.delete(budgets).where(eq(budgets.id, id));
  }
}
