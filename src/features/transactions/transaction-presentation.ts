import type { SymbolViewProps } from 'expo-symbols';

import { formatCop } from '@/features/accounts/account-format';
import { fallbackCategoryIcon, getCategoryIcon } from '@/features/categories/category-icons';
import { formatTransactionDate } from './transaction-date';
import type { TransactionListItem, TransactionSection } from './transaction.types';

const transferIcon: SymbolViewProps['name'] = {
  ios: 'arrow.left.arrow.right',
  android: 'swap_horiz',
  web: 'swap_horiz',
};
const refundIcon: SymbolViewProps['name'] = {
  ios: 'arrow.uturn.backward.circle.fill',
  android: 'assignment_return',
  web: 'assignment_return',
};

export function signedTransactionAmount(item: Pick<TransactionListItem, 'amount' | 'type'>) {
  if (item.type === 'transfer') return formatCop(item.amount);
  return `${item.type === 'expense' ? '-' : '+'}${formatCop(item.amount)}`;
}

export function transactionTitle(item: Pick<TransactionListItem, 'note' | 'categoryName' | 'type'>) {
  if (item.note) return item.note;
  if (item.type === 'transfer') return 'Transfer';
  if (item.type === 'refund') return 'Refund';
  return item.categoryName ?? 'Transaction';
}

export function transactionAccountLabel(
  item: Pick<TransactionListItem, 'accountName' | 'destinationAccountName' | 'type'>,
) {
  return item.type === 'transfer'
    ? `${item.accountName} → ${item.destinationAccountName ?? 'Unknown account'}`
    : item.accountName;
}

export function transactionTypeLabel(item: Pick<TransactionListItem, 'type'>) {
  if (item.type === 'income') return 'Income';
  if (item.type === 'transfer') return 'Transfer';
  if (item.type === 'refund') return 'Refund';
  return 'Expense';
}

export function groupTransactions(items: TransactionListItem[]): TransactionSection[] {
  const groups = new Map<string, TransactionListItem[]>();
  for (const item of items) {
    groups.set(item.transactionDate, [...(groups.get(item.transactionDate) ?? []), item]);
  }
  return [...groups].map(([id, transactions]) => ({
    id,
    label: formatTransactionDate(id),
    transactions,
  }));
}

export function transactionIcon(
  item: Pick<TransactionListItem, 'categoryIcon' | 'type'>,
): SymbolViewProps['name'] {
  if (item.type === 'transfer') return transferIcon;
  if (item.type === 'refund') return refundIcon;
  return getCategoryIcon(item.categoryIcon ?? fallbackCategoryIcon);
}
