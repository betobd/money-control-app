import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { ProgressBar } from '@/components/progress-bar';
import { spacing, typography } from '@/constants/theme';
import { formatCop } from '@/features/accounts/account-format';
import type { BudgetSummary } from '@/features/budgets/budget.types';
import { useAppTheme } from '@/hooks/use-app-theme';

export function BudgetProgressCard({ summary }: { summary: BudgetSummary }) {
  const theme = useAppTheme();
  const hasBudget = summary.totalBudget > 0;
  const overBudget = summary.totalSpent > summary.totalBudget;
  const fillColor = overBudget ? theme.destructive : theme.progressFill;

  return (
    <Card
      accessibilityLabel={
        hasBudget
          ? `Monthly budget, ${formatCop(summary.totalSpent)} spent of ${formatCop(summary.totalBudget)}, ${summary.percentageUsed}% used`
          : 'No budgets set for this month'
      }
      style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.primaryText }]}>Monthly budget</Text>
        {hasBudget ? (
          <Text style={[styles.meta, { color: overBudget ? theme.destructive : theme.secondaryText }]}>{summary.percentageUsed}% used</Text>
        ) : null}
      </View>

      {hasBudget ? (
        <>
          <ProgressBar
            accessibilityRole="progressbar"
            accessibilityValue={{ max: 100, min: 0, now: Math.min(summary.percentageUsed, 100) }}
            color={fillColor}
            height={10}
            value={summary.percentageUsed / 100}
          />
          <View style={styles.footerRow}>
            <Text style={[styles.spent, { color: theme.secondaryText }]}>{formatCop(summary.totalSpent)} spent</Text>
            <Text style={[styles.meta, { color: theme.mutedText }]}>of {formatCop(summary.totalBudget)}</Text>
          </View>
        </>
      ) : (
        <Text style={[styles.meta, { color: theme.mutedText }]}>No budgets set for this month</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md - spacing.xs,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.sectionTitle,
    fontSize: 15,
    lineHeight: 20,
  },
  footerRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spent: {
    ...typography.moneyRow,
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    ...typography.moneyRow,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
