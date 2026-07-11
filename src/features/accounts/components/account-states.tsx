import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { AccountCard } from '@/features/accounts/components/account-card';
import { archivedAccountMock } from '@/features/accounts/accounts.mock';
import { useAppTheme } from '@/hooks/use-app-theme';

export function EmptyAccountsState() {
  const theme = useAppTheme();

  return (
    <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.elevatedSurface }]}>
        <SymbolView
          name={{ ios: 'wallet.bifold', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
          size={28}
          tintColor={theme.secondaryText}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No accounts yet</Text>
      <Text style={[styles.emptyBody, { color: theme.secondaryText }]}>Add an account to start tracking balances.</Text>
    </View>
  );
}

export function LoadingAccountCard() {
  const theme = useAppTheme();

  return (
    <View
      accessibilityLabel="Loading account"
      accessibilityRole="progressbar"
      style={[styles.loading, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.loadingIcon, { backgroundColor: theme.disabledSurface }]} />
      <View style={styles.loadingCopy}>
        <View style={[styles.loadingName, { backgroundColor: theme.disabledSurface }]} />
        <View style={[styles.loadingType, { backgroundColor: theme.disabledSurface }]} />
        <View style={[styles.loadingBalance, { backgroundColor: theme.disabledSurface }]} />
      </View>
    </View>
  );
}

export function ArchivedAccountState() {
  return <AccountCard account={archivedAccountMock} />;
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  emptyTitle: {
    ...typography.sectionTitle,
  },
  emptyBody: {
    ...typography.body,
    textAlign: 'center',
  },
  loading: {
    alignItems: 'flex-start',
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 164,
    padding: spacing.md,
  },
  loadingIcon: {
    borderRadius: borderRadii.full,
    height: 44,
    width: 44,
  },
  loadingCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  loadingName: {
    borderRadius: borderRadii.sm,
    height: 18,
    width: '62%',
  },
  loadingType: {
    borderRadius: borderRadii.sm,
    height: 13,
    width: '42%',
  },
  loadingBalance: {
    borderRadius: borderRadii.sm,
    height: 28,
    marginTop: spacing.lg,
    width: '72%',
  },
});
