import { EmptyState } from '@/components/empty-state';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Skeleton } from '@/components/skeleton';
import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

export function EmptyBudgetsState({ onCreate }: { onCreate: () => void }) {
  const t = useMessages();
  return (
    <EmptyState
      action={{ label: t.budgets.createBudget, onPress: onCreate, accessibilityLabel: t.budgets.createFirstBudget }}
      body={t.budgets.emptyBody}
      icon={{ ios: 'chart.bar', android: 'monitoring', web: 'monitoring' }}
      title={t.budgets.emptyTitle}
    />
  );
}

export function LoadingBudgetCard() {
  const theme = useAppTheme();
  const t = useMessages();
  return (
    <View accessibilityLabel={t.budgets.loadingBudgets} accessibilityRole="progressbar" style={[styles.loading, { backgroundColor: theme.surface }]}>
      <View style={styles.loadingHeader}>
        <Skeleton style={styles.loadingIcon} />
        <Skeleton style={styles.loadingTitle} />
      </View>
      <Skeleton style={styles.loadingAmount} />
      <Skeleton style={styles.loadingBar} />
    </View>
  );
}

export function BudgetErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const theme = useAppTheme();
  const t = useMessages();
  return (
    <View style={[styles.empty, { backgroundColor: theme.surface }]}>
      <Text accessibilityLiveRegion="assertive" style={[styles.emptyBody, { color: theme.destructive }]}>{message}</Text>
      <Button accessibilityLabel={t.budgets.retryLoading} label={t.common.retry} onPress={onRetry} variant="tonal" />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', borderRadius: borderRadii.card, gap: spacing.sm, padding: spacing.xl },
  emptyIcon: { alignItems: 'center', borderRadius: borderRadii.card, height: 56, justifyContent: 'center', width: 56 },
  emptyTitle: { ...typography.sectionTitle, textAlign: 'center' },
  emptyBody: { ...typography.body, textAlign: 'center' },
  loading: { borderRadius: borderRadii.card, gap: spacing.md, minHeight: 176, padding: spacing.md },
  loadingHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  loadingIcon: { borderRadius: borderRadii.md, height: 40, width: 40 },
  loadingTitle: { borderRadius: borderRadii.sm, height: 18, width: '54%' },
  loadingAmount: { borderRadius: borderRadii.sm, height: 20, width: '70%' },
  loadingBar: { borderRadius: borderRadii.full, height: 8, marginTop: spacing.sm, width: '100%' },
});
