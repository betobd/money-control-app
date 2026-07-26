import { and, asc, eq, lte } from 'drizzle-orm';

import { database } from '@/database/client';
import { budgetRules } from '@/database/schema';
import type { BudgetRulePatch, BudgetRuleRepository } from './budget-rule.repository';
import type { BudgetRule } from './budget-rule.types';

export class SQLiteBudgetRuleRepository implements BudgetRuleRepository {
  async create(rule: BudgetRule): Promise<void> {
    await database.insert(budgetRules).values(rule);
  }

  async findById(id: string): Promise<BudgetRule | null> {
    const [row] = await database.select().from(budgetRules).where(eq(budgetRules.id, id)).limit(1);
    return row ?? null;
  }

  async findActiveByCategory(categoryId: string): Promise<BudgetRule | null> {
    const [row] = await database
      .select()
      .from(budgetRules)
      .where(and(eq(budgetRules.categoryId, categoryId), eq(budgetRules.isActive, true)))
      .limit(1);
    return row ?? null;
  }

  async listActiveForMonth(month: string): Promise<BudgetRule[]> {
    return database
      .select()
      .from(budgetRules)
      .where(and(eq(budgetRules.isActive, true), lte(budgetRules.startMonth, month)))
      .orderBy(asc(budgetRules.startMonth), asc(budgetRules.createdAt));
  }

  async update(id: string, patch: BudgetRulePatch): Promise<void> {
    await database
      .update(budgetRules)
      .set({ limitAmount: patch.limitAmount, color: patch.color, updatedAt: patch.updatedAt })
      .where(eq(budgetRules.id, id));
  }

  async deactivate(id: string, updatedAt: string): Promise<void> {
    await database.update(budgetRules).set({ isActive: false, updatedAt }).where(eq(budgetRules.id, id));
  }
}
