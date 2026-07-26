import type { BudgetColor, Budget, BudgetInput, BudgetRecord, BudgetSpendingRecord } from './budget.types';

export type BudgetUpdateRecord = BudgetInput & { updatedAt: string; ruleId?: string | null };
export type BudgetInstancePatch = { limitAmount: number; color: BudgetColor; updatedAt: string };

export interface BudgetRepository {
  create(budget: Budget): Promise<void>;
  /** Inserts a materialized instance, ignoring the row if one already exists for that category and month. */
  materialize(budget: Budget): Promise<void>;
  findById(id: string): Promise<BudgetRecord | null>;
  findDuplicate(categoryId: string, month: string, excludingId?: string): Promise<BudgetRecord | null>;
  listMonth(month: string): Promise<BudgetSpendingRecord[]>;
  listAll(): Promise<BudgetSpendingRecord[]>;
  remove(id: string): Promise<void>;
  update(id: string, budget: BudgetUpdateRecord): Promise<void>;
  /** Applies a patch to every instance of a rule from the given month onward (this month + future). */
  updateForRuleFromMonth(ruleId: string, month: string, patch: BudgetInstancePatch): Promise<void>;
  /** Deletes every instance of a rule from the given month onward (this month + future). */
  deleteForRuleFromMonth(ruleId: string, month: string): Promise<void>;
}
