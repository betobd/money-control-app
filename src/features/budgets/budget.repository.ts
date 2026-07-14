import type { Budget, BudgetInput, BudgetRecord, BudgetSpendingRecord } from './budget.types';

export type BudgetUpdateRecord = BudgetInput & { updatedAt: string };

export interface BudgetRepository {
  create(budget: Budget): Promise<void>;
  findById(id: string): Promise<BudgetRecord | null>;
  findDuplicate(categoryId: string, month: string, excludingId?: string): Promise<BudgetRecord | null>;
  listMonth(month: string): Promise<BudgetSpendingRecord[]>;
  remove(id: string): Promise<void>;
  update(id: string, budget: BudgetUpdateRecord): Promise<void>;
}
