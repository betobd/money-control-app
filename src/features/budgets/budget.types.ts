export type BudgetStatus = 'on-track' | 'near-limit' | 'fully-used' | 'over-budget';
export type ProgressWidth = `${number}%`;

export type Budget = {
  id: string;
  categoryId: string;
  month: string;
  limitAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type BudgetInput = Pick<Budget, 'categoryId' | 'month' | 'limitAmount'>;
export type BudgetField = keyof BudgetInput;
export type BudgetValidationErrors = Partial<Record<BudgetField, string>>;

export type BudgetRecord = Budget & {
  categoryName: string;
  categoryIcon: string;
  categoryIsArchived: boolean;
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
};

export type BudgetSummary = {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  percentageUsed: number;
  progressWidth: ProgressWidth;
};

export type BudgetMonthView = {
  budgets: BudgetView[];
  summary: BudgetSummary;
};
