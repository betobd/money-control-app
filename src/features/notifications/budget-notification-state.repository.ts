import type { BudgetNotificationState } from './notification.types';

export interface BudgetNotificationStateRepository {
  list(): Promise<BudgetNotificationState[]>;
  find(budgetId: string, month: string): Promise<BudgetNotificationState | null>;
  save(state: BudgetNotificationState): Promise<void>;
  remove(budgetId: string, month?: string): Promise<void>;
  clear(): Promise<void>;
}
