import { type SymbolViewProps } from 'expo-symbols';

import { IconChip } from '@/components/icon-chip';
import type { AccountType } from '@/features/accounts/account.types';
import { useAppTheme } from '@/hooks/use-app-theme';

const accountIcons: Record<AccountType, SymbolViewProps['name']> = {
  checking: { ios: 'building.columns.fill', android: 'account_balance', web: 'account_balance' },
  savings: { ios: 'banknote.fill', android: 'savings', web: 'savings' },
  credit_card: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
  cash: { ios: 'wallet.bifold.fill', android: 'payments', web: 'payments' },
};

export function AccountTypeIcon({ kind, size = 40 }: { kind: AccountType; size?: number }) {
  const theme = useAppTheme();
  const { color, background } = tintFor(kind, theme);

  return <IconChip background={background} color={color} icon={accountIcons[kind]} iconSize={20} size={size} />;
}

function tintFor(kind: AccountType, theme: ReturnType<typeof useAppTheme>) {
  if (kind === 'savings') return { color: theme.income, background: theme.tintIncome };
  if (kind === 'credit_card') return { color: theme.expense, background: theme.tintExpense };
  if (kind === 'checking') return { color: theme.primaryAction, background: theme.tintPrimary };
  return { color: theme.transfer, background: theme.tintTransfer };
}
