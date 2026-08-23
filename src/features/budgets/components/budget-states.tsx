import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Skeleton } from '@/components/skeleton';
import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export function EmptyBudgetsState({ onCreate }: { onCreate: () => void }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.empty, { backgroundColor: theme.surface }]}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.tintPrimary }]}>
        <SymbolView name={{ ios: 'chart.bar', android: 'monitoring', web: 'monitoring' }} size={28} tintColor={theme.primaryAction} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No budgets for this month</Text>
      <Text style={[styles.emptyBody, { color: theme.secondaryText }]}>Create a category budget to start planning your monthly spending.</Text>
      <Button accessibilityLabel="Create the first budget" label="Create budget" onPress={onCreate} variant="primary" />
    </View>
  );
}

export function LoadingBudgetCard() {
  const theme = useAppTheme();
  return (
    <View accessibilityLabel="Loading budgets" accessibilityRole="progressbar" style={[styles.loading, { backgroundColor: theme.surface }]}>
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
  return (
    <View style={[styles.empty, { backgroundColor: theme.surface }]}>
      <Text accessibilityLiveRegion="assertive" style={[styles.emptyBody, { color: theme.destructive }]}>{message}</Text>
      <Button accessibilityLabel="Retry loading budgets" label="Retry" onPress={onRetry} variant="tonal" />
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
