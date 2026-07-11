import type { SymbolViewProps } from 'expo-symbols';

export type FinancialTone = 'default' | 'income' | 'expense';

export type RecentTransactionMock = {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  tone: Exclude<FinancialTone, 'default'>;
  icon: SymbolViewProps['name'];
};

export const homeDashboardMock = {
  month: 'October 2024',
  totalBalance: '$125.450.000',
  currency: 'COP',
  income: '+$2.800.000',
  expenses: '-$1.250.000',
  netBalance: '+$1.550.000',
  budget: {
    percentage: 65,
    label: '65% of budget used',
  },
  recentTransactions: [
    {
      id: 'groceries',
      title: 'Groceries',
      subtitle: 'Today, 10:45 AM · Expense',
      amount: '-$120.000',
      tone: 'expense',
      icon: { ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' },
    },
    {
      id: 'transport',
      title: 'Transport',
      subtitle: 'Yesterday, 6:30 PM · Expense',
      amount: '-$35.000',
      tone: 'expense',
      icon: { ios: 'car.fill', android: 'directions_car', web: 'directions_car' },
    },
    {
      id: 'salary',
      title: 'Salary',
      subtitle: 'Oct 1, 9:00 AM · Income',
      amount: '+$2.800.000',
      tone: 'income',
      icon: { ios: 'banknote.fill', android: 'payments', web: 'payments' },
    },
  ] satisfies RecentTransactionMock[],
} as const;
