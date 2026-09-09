import type { MonthlyBudget } from './monthly-budget.types';

export interface MonthlyBudgetRepository {
  /**
   * The ceiling row governing `month`: its own row, or the most recent earlier
   * one it inherits from. May be an inactive tombstone, which the caller reads
   * as "no ceiling from here on".
   */
  findEffective(month: string): Promise<MonthlyBudget | null>;
  /** Writes the row for its month, replacing any row that month already has. */
  upsert(budget: MonthlyBudget): Promise<void>;
  /**
   * Drops every row after `month`, so a change at `month` governs the months
   * that were inheriting from it.
   */
  deleteAfter(month: string): Promise<void>;
  listAll(): Promise<MonthlyBudget[]>;
  /** Posted expenses minus refunds for the month, in base-currency minor units. */
  spendingFor(month: string): Promise<number>;
}
