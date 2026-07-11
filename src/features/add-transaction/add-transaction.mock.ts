import type { SymbolViewProps } from 'expo-symbols';

export type TransactionFormType = 'expense' | 'income' | 'transfer';

export type CategoryOptionMock = {
  id: string;
  label: string;
  icon: SymbolViewProps['name'];
};

export const transactionFormMock = {
  expenseCategories: [
    { id: 'food', label: 'Food', icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' } },
    { id: 'bills', label: 'Bills', icon: { ios: 'doc.text.fill', android: 'receipt_long', web: 'receipt_long' } },
    { id: 'transport', label: 'Transport', icon: { ios: 'car.fill', android: 'directions_car', web: 'directions_car' } },
    { id: 'shopping', label: 'Shopping', icon: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' } },
  ] satisfies CategoryOptionMock[],
  incomeCategories: [
    { id: 'salary', label: 'Salary', icon: { ios: 'banknote.fill', android: 'payments', web: 'payments' } },
    { id: 'freelance', label: 'Freelance', icon: { ios: 'briefcase.fill', android: 'work', web: 'work' } },
    { id: 'gift', label: 'Gift', icon: { ios: 'gift.fill', android: 'redeem', web: 'redeem' } },
    { id: 'other-income', label: 'Other', icon: { ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' } },
  ] satisfies CategoryOptionMock[],
  expenseAccount: 'Main Checking',
  incomeAccount: 'Savings',
  transferSource: 'Main Checking',
  transferDestination: 'Savings',
  date: 'Today, 24 Oct',
} as const;
