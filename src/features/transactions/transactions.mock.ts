import type { SymbolViewProps } from 'expo-symbols';

export type TransactionKind = 'income' | 'expense' | 'transfer';

export type TransactionMock = {
  id: string;
  title: string;
  account: string;
  classification: string;
  time: string;
  amount: string;
  kind: TransactionKind;
  icon: SymbolViewProps['name'];
};

export type TransactionSectionMock = {
  id: string;
  label: string;
  transactions: TransactionMock[];
};

export const transactionHistoryMock: TransactionSectionMock[] = [
  {
    id: 'today',
    label: 'Today, Oct 24',
    transactions: [
      {
        id: 'el-corral',
        title: 'El Corral',
        account: 'Bancolombia',
        classification: 'Food',
        time: '12:30 PM',
        amount: '-$45.000',
        kind: 'expense',
        icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
      },
      {
        id: 'uber',
        title: 'Uber',
        account: 'Credit Card',
        classification: 'Transport',
        time: '9:15 AM',
        amount: '-$18.500',
        kind: 'expense',
        icon: { ios: 'car.fill', android: 'directions_car', web: 'directions_car' },
      },
    ],
  },
  {
    id: 'yesterday',
    label: 'Yesterday, Oct 23',
    transactions: [
      {
        id: 'freelance',
        title: 'Freelance Project',
        account: 'Nequi',
        classification: 'Work',
        time: '4:40 PM',
        amount: '+$850.000',
        kind: 'income',
        icon: { ios: 'briefcase.fill', android: 'work', web: 'work' },
      },
      {
        id: 'savings-transfer',
        title: 'Transfer to Savings',
        account: 'Main Checking → Savings',
        classification: 'Between accounts',
        time: '11:10 AM',
        amount: '↔ $500.000',
        kind: 'transfer',
        icon: { ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' },
      },
      {
        id: 'groceries',
        title: 'Éxito',
        account: 'Bancolombia',
        classification: 'Groceries',
        time: '8:05 AM',
        amount: '-$125.400',
        kind: 'expense',
        icon: { ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' },
      },
    ],
  },
  {
    id: 'october-20',
    label: 'Oct 20',
    transactions: [
      {
        id: 'car-purchase',
        title: 'New Car Down Payment With A Long Merchant Name',
        account: 'Bancolombia',
        classification: 'Transport',
        time: '2:20 PM',
        amount: '-$125.450.000',
        kind: 'expense',
        icon: { ios: 'car.side.fill', android: 'directions_car', web: 'directions_car' },
      },
      {
        id: 'salary',
        title: 'Monthly Salary',
        account: 'Main Checking',
        classification: 'Salary',
        time: '8:00 AM',
        amount: '+$2.800.000',
        kind: 'income',
        icon: { ios: 'banknote.fill', android: 'payments', web: 'payments' },
      },
    ],
  },
];
