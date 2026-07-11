import type { SymbolViewProps } from 'expo-symbols';

export type BudgetStatus = 'on-track' | 'near-limit' | 'fully-used' | 'over-budget';
export type ProgressWidth = `${number}%`;

export type BudgetMock = {
  id: string;
  category: string;
  spent: string;
  limit: string;
  remaining: string;
  percentage: number;
  progressWidth: ProgressWidth;
  status: BudgetStatus;
  icon: SymbolViewProps['name'];
};

export type BudgetSummaryMock = {
  total: string;
  spent: string;
  remaining: string;
  percentage: number;
  progressWidth: ProgressWidth;
};

export const budgetsOverviewMock = {
  month: 'May 2024',
  summary: {
    total: '$3.600.000',
    spent: '$3.260.000',
    remaining: '$340.000',
    percentage: 91,
    progressWidth: '91%',
  } satisfies BudgetSummaryMock,
  budgets: [
    {
      id: 'food',
      category: 'Food & Dining',
      spent: '$250.000',
      limit: '$600.000',
      remaining: '$350.000',
      percentage: 42,
      progressWidth: '42%',
      status: 'on-track',
      icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
    },
    {
      id: 'rent',
      category: 'Rent & Utilities',
      spent: '$2.000.000',
      limit: '$2.000.000',
      remaining: '$0',
      percentage: 100,
      progressWidth: '100%',
      status: 'fully-used',
      icon: { ios: 'house.fill', android: 'home', web: 'home' },
    },
    {
      id: 'entertainment',
      category: 'Entertainment With A Long Category Name',
      spent: '$550.000',
      limit: '$600.000',
      remaining: '$50.000',
      percentage: 92,
      progressWidth: '92%',
      status: 'near-limit',
      icon: { ios: 'film.fill', android: 'movie', web: 'movie' },
    },
    {
      id: 'shopping',
      category: 'Shopping',
      spent: '$460.000',
      limit: '$400.000',
      remaining: '-$60.000',
      percentage: 115,
      progressWidth: '115%',
      status: 'over-budget',
      icon: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' },
    },
  ] satisfies BudgetMock[],
} as const;

export const fullyUsedBudgetMock: BudgetMock = {
  id: 'fully-used',
  category: 'Rent & Utilities',
  spent: '$2.000.000',
  limit: '$2.000.000',
  remaining: '$0',
  percentage: 100,
  progressWidth: '100%',
  status: 'fully-used',
  icon: { ios: 'house.fill', android: 'home', web: 'home' },
};

export const nearLimitBudgetMock: BudgetMock = {
  id: 'near-limit',
  category: 'Food & Dining',
  spent: '$550.000',
  limit: '$600.000',
  remaining: '$50.000',
  percentage: 92,
  progressWidth: '92%',
  status: 'near-limit',
  icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
};

export const overBudgetMock: BudgetMock = {
  id: 'over-budget',
  category: 'Shopping',
  spent: '$460.000',
  limit: '$400.000',
  remaining: '-$60.000',
  percentage: 115,
  progressWidth: '115%',
  status: 'over-budget',
  icon: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' },
};
