import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Skeleton } from '@/components/skeleton';
import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export function EmptyAccountsState() {
  const theme = useAppTheme();

  return (
    <View style={[styles.empty, { backgroundColor: theme.surface }]}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.tintPrimary }]}>
        <SymbolView
          name={{ ios: 'wallet.bifold', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
          size={28}
          tintColor={theme.primaryAction}
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
      style={[styles.loading, { backgroundColor: theme.surface }]}>
      <Skeleton style={styles.loadingIcon} />
      <View style={styles.loadingCopy}>
        <Skeleton style={styles.loadingName} />
        <Skeleton style={styles.loadingType} />
        <Skeleton style={styles.loadingBalance} />
      </View>
    </View>
  );
}

export function AccountsErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.empty, { backgroundColor: theme.surface }]}>
      <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>Unable to load accounts</Text>
      <Text style={[styles.emptyBody, { color: theme.secondaryText }]}>{message}</Text>
      <Button accessibilityLabel="Retry loading accounts" label="Retry" onPress={onRetry} variant="tonal" />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    borderRadius: borderRadii.card,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: borderRadii.card,
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
    borderRadius: borderRadii.card,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    minHeight: 150,
    padding: spacing.md,
  },
  loadingIcon: {
    borderRadius: borderRadii.md,
    height: 40,
    width: 40,
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
