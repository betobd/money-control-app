import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { borderRadii } from '@/constants/theme';
import type { AccountKind } from '@/features/accounts/accounts.mock';
import { useAppTheme } from '@/hooks/use-app-theme';

const accountIcons: Record<AccountKind, SymbolViewProps['name']> = {
  checking: { ios: 'building.columns.fill', android: 'account_balance', web: 'account_balance' },
  savings: { ios: 'banknote.fill', android: 'savings', web: 'savings' },
  credit: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
  cash: { ios: 'wallet.bifold.fill', android: 'payments', web: 'payments' },
};

export function AccountTypeIcon({ kind }: { kind: AccountKind }) {
  const theme = useAppTheme();
  const color =
    kind === 'savings'
      ? theme.income
      : kind === 'credit'
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
