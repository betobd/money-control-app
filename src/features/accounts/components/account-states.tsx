
import { EmptyState } from '@/components/empty-state';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Skeleton } from '@/components/skeleton';
import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

export function EmptyAccountsState({ onCreate }: { onCreate: () => void }) {
  const t = useMessages();
  return (
    <EmptyState
      action={{ label: t.accounts.states.emptyAction, onPress: onCreate, accessibilityLabel: t.accounts.states.emptyActionAccessibility }}
      body={t.accounts.states.emptyBody}
      icon={{ ios: 'wallet.bifold', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
      title={t.accounts.states.emptyTitle}
    />
  );
}

export function LoadingAccountCard() {
  const theme = useAppTheme();
  const t = useMessages();

  return (
    <View
      accessibilityLabel={t.accounts.states.loadingAccount}
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
  const t = useMessages();
  return (
    <View style={[styles.empty, { backgroundColor: theme.surface }]}>
      <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>{t.accounts.states.errorTitle}</Text>
      <Text style={[styles.emptyBody, { color: theme.secondaryText }]}>{message}</Text>
      <Button accessibilityLabel={t.accounts.states.retryAccessibility} label={t.common.retry} onPress={onRetry} variant="tonal" />
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
