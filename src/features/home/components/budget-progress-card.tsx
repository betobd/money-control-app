import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { ProgressBar } from '@/components/progress-bar';
import { spacing, typography } from '@/constants/theme';
import { formatCop } from '@/features/accounts/account-format';
import type { BudgetSummary, BudgetView } from '@/features/budgets/budget.types';
import { BudgetProgressBar } from '@/features/budgets/components/budget-progress-bar';
import { useAppTheme } from '@/hooks/use-app-theme';

export function BudgetProgressCard({ summary, budgets = [] }: { summary: BudgetSummary; budgets?: BudgetView[] }) {
  const theme = useAppTheme();
  const hasBudget = summary.totalBudget > 0;
  const overBudget = summary.totalSpent > summary.totalBudget;
  const fillColor = overBudget ? theme.destructive : theme.progressFill;

  return (
    <Card
      accessibilityLabel={
        hasBudget
          ? `Monthly budget, ${formatCop(summary.totalSpent)} spent of ${formatCop(summary.totalBudget)}, ${summary.percentageUsed}% used${overBudget ? ', over budget' : ''}`
          : 'No budgets set for this month'
      }
      style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.primaryText }]}>Monthly budget</Text>
        {hasBudget ? (
          <Text style={[styles.meta, { color: overBudget ? theme.destructive : theme.secondaryText }]}>
            {summary.percentageUsed}% used{overBudget ? ' · Over budget' : ''}
          </Text>
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

          {budgets.length > 0 ? (
            <View style={[styles.breakdown, { borderTopColor: theme.hairline }]}>
              <View style={styles.breakdownHeader}>
                <Text style={[styles.breakdownTitle, { color: theme.mutedText }]}>By category</Text>
                <Link asChild href="/budgets">
                  <Pressable accessibilityLabel="View all budgets" accessibilityRole="button" hitSlop={8}>
                    <Text style={[styles.viewAll, { color: theme.primaryAction }]}>View all</Text>
                  </Pressable>
                </Link>
              </View>
              {budgets.map((budget) => {
                const over = budget.status === 'over-budget';
                return (
                  <View
                    accessibilityLabel={`${budget.categoryName}, ${budget.percentageUsed}% used${over ? ', over budget' : ''}`}
                    key={budget.id}
                    style={styles.row}>
                    <View style={styles.rowHeader}>
                      <Text numberOfLines={1} style={[styles.rowName, { color: theme.secondaryText }]}>
                        {budget.categoryName}
                      </Text>
                      <Text style={[styles.rowPercent, { color: over ? theme.destructive : theme.mutedText }]}>
                        {budget.percentageUsed}%
                      </Text>
                    </View>
                    <BudgetProgressBar
                      color={budget.color}
                      percentage={budget.percentageUsed}
                      progressWidth={budget.progressWidth}
                      status={budget.status}
                    />
                  </View>
                );
              })}
            </View>
          ) : null}
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
  breakdown: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm + spacing.xs,
    paddingTop: spacing.md - spacing.xs,
  },
  breakdownHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownTitle: {
    ...typography.overline,
  },
  viewAll: {
    ...typography.label,
  },
  row: {
    gap: spacing.xs + 2,
  },
  rowHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowName: {
    ...typography.caption,
    flex: 1,
    marginRight: spacing.sm,
  },
  rowPercent: {
    ...typography.moneyRow,
    fontSize: 13,
    lineHeight: 18,
  },
});
