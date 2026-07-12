import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
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

export function AccountsErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.destructive }]}>
      <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>Unable to load accounts</Text>
      <Text style={[styles.emptyBody, { color: theme.secondaryText }]}>{message}</Text>
      <Text accessibilityRole="button" onPress={onRetry} style={[styles.retry, { color: theme.primaryAction }]}>Retry</Text>
    </View>
  );
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
  retry: { ...typography.body, fontWeight: '700', minHeight: 48, paddingVertical: spacing.sm },
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
