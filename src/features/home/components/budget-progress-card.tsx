import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { formatCop } from '@/features/accounts/account-format';
import type { BudgetSummary } from '@/features/budgets/budget.types';
import { useAppTheme } from '@/hooks/use-app-theme';

export function BudgetProgressCard({ summary }: { summary: BudgetSummary }) {
  const theme = useAppTheme();
  const hasBudget = summary.totalBudget > 0;
  const overBudget = summary.totalSpent > summary.totalBudget;
  const label = hasBudget
    ? `${formatCop(summary.totalSpent)} spent of ${formatCop(summary.totalBudget)}`
    : 'No budgets set for this month';

  return (
    <View accessibilityLabel={hasBudget ? `Monthly budget, ${label}, ${summary.percentageUsed}% used` : label} style={[styles.card, { backgroundColor: theme.surface, borderColor: overBudget ? theme.destructive : theme.border }]}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.primaryText }]}>Monthly budget</Text>
          <Text style={[styles.label, { color: theme.secondaryText }]}>{label}</Text>
        </View>
        {hasBudget ? (
          <View accessibilityRole="progressbar" accessibilityValue={{ max: 100, min: 0, now: Math.min(summary.percentageUsed, 100) }} style={[styles.badge, { backgroundColor: overBudget ? theme.elevatedSurface : theme.selectedNavigationBackground }]}>
            <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[styles.percentage, { color: overBudget ? theme.destructive : theme.selectedNavigationForeground }]}>{summary.percentageUsed}%</Text>
          </View>
        ) : null}
      </View>
      {hasBudget ? (
        <View style={[styles.track, { backgroundColor: theme.progressTrack }]}>
          <View style={[styles.fill, { backgroundColor: overBudget ? theme.destructive : theme.progressFill, width: summary.progressWidth }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, gap: spacing.md, padding: spacing.md },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  copy: { flex: 1, gap: spacing.xs },
  title: { ...typography.sectionTitle },
  label: { ...typography.body },
  badge: { alignItems: 'center', borderRadius: borderRadii.full, height: 52, justifyContent: 'center', paddingHorizontal: spacing.xs, minWidth: 52 },
  percentage: { ...typography.label },
  track: { borderRadius: borderRadii.full, height: 8, overflow: 'hidden' },
  fill: { borderRadius: borderRadii.full, height: '100%' },
});
