import type { BudgetColorKey } from '@/constants/theme';
import type { MonthlyBudgetView } from './monthly-budget.types';

export type BudgetStatus = 'on-track' | 'near-limit' | 'fully-used' | 'over-budget';
export type ProgressWidth = `${number}%`;
export type BudgetColor = BudgetColorKey | null;

export type Budget = {
  id: string;
  categoryId: string;
  month: string;
  limitAmount: number;
  color: BudgetColor;
  ruleId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BudgetInput = Pick<Budget, 'categoryId' | 'month' | 'limitAmount' | 'color'>;
export type BudgetField = keyof BudgetInput;
export type BudgetValidationErrors = Partial<Record<BudgetField, string>>;

export type BudgetRecord = Budget & {
  categoryName: string;
  categoryIcon: string;
  categoryIsArchived: boolean;
  /** Null when the budget is on a top-level category, set when it is on a subcategory. */
  categoryParentId: string | null;
  categoryParentName: string | null;
};

export type BudgetSpendingRecord = BudgetRecord & {
  spent: number;
};

export type BudgetView = BudgetRecord & {
  spent: number;
  remaining: number;
  percentageUsed: number;
  progressWidth: ProgressWidth;
  status: BudgetStatus;
  isRecurring: boolean;
};

export type BudgetSummary = {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  percentageUsed: number;
  progressWidth: ProgressWidth;
  /**
   * How many subcategory budgets were left out of the totals because their
   * parent is budgeted too. They are sub-limits inside it, already counted once.
   */
  nestedCount: number;
};

export type BudgetMonthView = {
  budgets: BudgetView[];
  summary: BudgetSummary;
  /** The overall monthly ceiling, or null when none is set for this month. */
  ceiling: MonthlyBudgetView | null;
};

/** A top-level budget with the subcategory sub-limits nested inside it. */
export type BudgetGroup = {
  budget: BudgetView;
  children: BudgetView[];
};
