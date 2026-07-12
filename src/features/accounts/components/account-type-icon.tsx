import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { borderRadii } from '@/constants/theme';
import type { AccountType } from '@/features/accounts/account.types';
import { useAppTheme } from '@/hooks/use-app-theme';

const accountIcons: Record<AccountType, SymbolViewProps['name']> = {
  checking: { ios: 'building.columns.fill', android: 'account_balance', web: 'account_balance' },
  savings: { ios: 'banknote.fill', android: 'savings', web: 'savings' },
  credit_card: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
  cash: { ios: 'wallet.bifold.fill', android: 'payments', web: 'payments' },
};

export function AccountTypeIcon({ kind }: { kind: AccountType }) {
  const theme = useAppTheme();
  const color =
    kind === 'savings'
      ? theme.income
      : kind === 'credit_card'
        ? theme.expense
        : kind === 'checking'
          ? theme.primaryAction
          : theme.secondaryText;

  return (
    <View style={[styles.container, { backgroundColor: theme.elevatedSurface }]}>
      <SymbolView name={accountIcons[kind]} size={22} tintColor={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
