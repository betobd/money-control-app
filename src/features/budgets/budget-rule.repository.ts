import type { BudgetColor } from './budget.types';
import type { BudgetRule } from './budget-rule.types';

export type BudgetRulePatch = { limitAmount: number; color: BudgetColor; updatedAt: string };

export interface BudgetRuleRepository {
  create(rule: BudgetRule): Promise<void>;
  findById(id: string): Promise<BudgetRule | null>;
  findActiveByCategory(categoryId: string): Promise<BudgetRule | null>;
  listActiveForMonth(month: string): Promise<BudgetRule[]>;
  update(id: string, patch: BudgetRulePatch): Promise<void>;
  deactivate(id: string, updatedAt: string): Promise<void>;
}
