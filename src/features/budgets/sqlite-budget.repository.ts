import { and, asc, eq, gte, ne, sql } from 'drizzle-orm';

import { database } from '@/database/client';
import { budgets, categories } from '@/database/schema';
import { nextBudgetMonth } from './budget-month';
import type { BudgetInstancePatch, BudgetRepository, BudgetUpdateRecord } from './budget.repository';
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

  async materialize(budget: Budget): Promise<void> {
    await database.insert(budgets).values(budget).onConflictDoNothing();
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
        spent: sql<number>`(
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
            and refund_rows.transaction_date >= ${start}
            and refund_rows.transaction_date < ${next}
            and coalesce(refund_rows.category_id, original_rows.category_id) = ${budgets.categoryId}
        )`,
      })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .where(eq(budgets.month, month))
      .orderBy(asc(categories.name), asc(budgets.createdAt));

    return rows.map((row) => ({ ...mapRecord(row), spent: Number(row.spent) }));
  }

  async listAll(): Promise<BudgetSpendingRecord[]> {
    const rows = await database
      .select({
        ...recordSelection,
        spent: sql<number>`(
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
            and refund_rows.transaction_date >= ${budgets.month} || '-01'
            and refund_rows.transaction_date < date(${budgets.month} || '-01', '+1 month')
            and coalesce(refund_rows.category_id, original_rows.category_id) = ${budgets.categoryId}
        )`,
      })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
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
