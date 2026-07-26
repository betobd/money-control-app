import type { BudgetColor } from './budget.types';

/**
 * A recurring-budget template. While active, it materializes a concrete budget
 * for each viewed month from startMonth onward.
 */
export type BudgetRule = {
  id: string;
  categoryId: string;
  limitAmount: number;
  color: BudgetColor;
  startMonth: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BudgetRuleInput = Pick<BudgetRule, 'categoryId' | 'limitAmount' | 'color' | 'startMonth'>;
