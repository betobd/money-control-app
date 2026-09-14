import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { ProgressBar } from '@/components/progress-bar';
import { fonts, spacing, typography } from '@/constants/theme';
import { formatBase } from '@/features/accounts/account-format';
import type { BudgetSummary, BudgetView } from '@/features/budgets/budget.types';
import type { MonthlyBudgetView } from '@/features/budgets/monthly-budget.types';
import { BudgetProgressBar } from '@/features/budgets/components/budget-progress-bar';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

export function BudgetProgressCard({
  summary,
  budgets = [],
  ceiling = null,
}: {
  summary: BudgetSummary;
  budgets?: BudgetView[];
  ceiling?: MonthlyBudgetView | null;
}) {
  const theme = useAppTheme();
  const t = useMessages();
  // The ceiling takes the headline when it exists: it covers every expense, so
  // the category total below it is a subset rather than a competing number.
  const headline = ceiling
    ? { total: ceiling.limitAmount, spent: ceiling.spent, percentageUsed: ceiling.percentageUsed }
    : { total: summary.totalBudget, spent: summary.totalSpent, percentageUsed: summary.percentageUsed };
  const hasBudget = headline.total > 0;
  const overBudget = headline.spent > headline.total;
  const fillColor = overBudget ? theme.destructive : theme.progressFill;
  const title = ceiling ? t.home.monthlyCeiling : t.home.monthlyBudget;

  return (
    <Card
      accessibilityLabel={
        hasBudget
          ? t.home.budgetCardLabel(title, formatBase(headline.spent), formatBase(headline.total), headline.percentageUsed, overBudget)
          : t.home.noBudgets
      }
      style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.primaryText }]}>
          {title}
        </Text>
        {hasBudget ? (
          <Text style={[styles.meta, { color: overBudget ? theme.destructive : theme.secondaryText }]}>
            {t.home.percentUsed(headline.percentageUsed)}{overBudget ? ` · ${t.home.overBudget}` : ''}
          </Text>
        ) : null}
      </View>

      {hasBudget ? (
        <>
          <ProgressBar
            accessibilityRole="progressbar"
            accessibilityValue={{ max: 100, min: 0, now: Math.min(headline.percentageUsed, 100) }}
            color={fillColor}
            height={10}
            value={headline.percentageUsed / 100}
          />
          <View style={styles.footerRow}>
            <Text style={[styles.spent, { color: theme.secondaryText }]}>{t.home.spent(formatBase(headline.spent))}</Text>
            <Text style={[styles.meta, { color: theme.mutedText }]}>{t.home.ofTotal(formatBase(headline.total))}</Text>
          </View>
          {ceiling ? (
            <Text style={[styles.meta, { color: theme.mutedText }]}>
              {t.home.ceilingNote}
            </Text>
          ) : null}

          {budgets.length > 0 ? (
            <View style={[styles.breakdown, { borderTopColor: theme.hairline }]}>
              <View style={styles.breakdownHeader}>
                <Text style={[styles.breakdownTitle, { color: theme.mutedText }]}>{t.home.byCategory}</Text>
                <Link asChild href="/budgets">
                  <Pressable accessibilityLabel={t.home.viewAllBudgets} accessibilityRole="button" hitSlop={8}>
                    <Text style={[styles.viewAll, { color: theme.primaryAction }]}>{t.home.viewAll}</Text>
                  </Pressable>
                </Link>
              </View>
              {budgets.map((budget) => {
                const over = budget.status === 'over-budget';
                return (
                  <View
                    accessibilityLabel={t.home.categoryRowLabel(budget.categoryName, budget.percentageUsed, over)}
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
        <Text style={[styles.meta, { color: theme.mutedText }]}>{t.home.noBudgets}</Text>
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
    fontFamily: fonts.mono.medium, fontWeight: '500',
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
