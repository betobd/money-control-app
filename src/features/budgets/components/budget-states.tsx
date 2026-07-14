import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export function EmptyBudgetsState({ onCreate }: { onCreate: () => void }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.elevatedSurface }]}>
        <SymbolView name={{ ios: 'chart.bar', android: 'monitoring', web: 'monitoring' }} size={28} tintColor={theme.secondaryText} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No budgets for this month</Text>
      <Text style={[styles.emptyBody, { color: theme.secondaryText }]}>Create a category budget to start planning your monthly spending.</Text>
      <Pressable accessibilityLabel="Create the first budget" accessibilityRole="button" onPress={onCreate} style={[styles.emptyAction, { backgroundColor: theme.primaryAction }]}>
        <Text style={[styles.emptyActionText, { color: theme.onPrimaryAction }]}>Create Budget</Text>
      </Pressable>
    </View>
  );
}

export function LoadingBudgetCard() {
  const theme = useAppTheme();
  return (
    <View accessibilityLabel="Loading budgets" accessibilityRole="progressbar" style={[styles.loading, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.loadingHeader}>
        <View style={[styles.loadingIcon, { backgroundColor: theme.disabledSurface }]} />
        <View style={[styles.loadingTitle, { backgroundColor: theme.disabledSurface }]} />
      </View>
      <View style={[styles.loadingAmount, { backgroundColor: theme.disabledSurface }]} />
      <View style={[styles.loadingBar, { backgroundColor: theme.disabledSurface }]} />
    </View>
  );
}

export function BudgetErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.destructive }]}>
      <Text accessibilityLiveRegion="assertive" style={[styles.emptyBody, { color: theme.destructive }]}>{message}</Text>
      <Pressable accessibilityLabel="Retry loading budgets" accessibilityRole="button" onPress={onRetry} style={[styles.retry, { borderColor: theme.primaryAction }]}>
        <Text style={[styles.emptyActionText, { color: theme.primaryAction }]}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, gap: spacing.sm, padding: spacing.xl },
  emptyIcon: { alignItems: 'center', borderRadius: borderRadii.full, height: 56, justifyContent: 'center', width: 56 },
  emptyTitle: { ...typography.sectionTitle, textAlign: 'center' },
  emptyBody: { ...typography.body, textAlign: 'center' },
  emptyAction: { alignItems: 'center', borderRadius: borderRadii.full, justifyContent: 'center', marginTop: spacing.sm, minHeight: 48, paddingHorizontal: spacing.lg },
  emptyActionText: { ...typography.body, fontWeight: '700' },
  retry: { alignItems: 'center', borderRadius: borderRadii.full, borderWidth: borderWidths.thin, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg },
  loading: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, gap: spacing.md, minHeight: 176, padding: spacing.md },
  loadingHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  loadingIcon: { borderRadius: borderRadii.full, height: 40, width: 40 },
  loadingTitle: { borderRadius: borderRadii.sm, height: 18, width: '54%' },
  loadingAmount: { borderRadius: borderRadii.sm, height: 20, width: '70%' },
  loadingBar: { borderRadius: borderRadii.full, height: 8, marginTop: spacing.sm, width: '100%' },
});
