import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Overline } from '@/components/overline';
import { spacing, typography } from '@/constants/theme';
import { formatBase } from '@/features/accounts/account-format';
import { BudgetProgressBar } from '@/features/budgets/components/budget-progress-bar';
import type { BudgetStatus, BudgetSummary } from '@/features/budgets/budget.types';
import { useAppTheme } from '@/hooks/use-app-theme';

function summaryStatus(summary: BudgetSummary): BudgetStatus {
  if (summary.totalSpent > summary.totalBudget) return 'over-budget';
  if (summary.totalSpent === summary.totalBudget) return 'fully-used';
  if (summary.totalSpent / summary.totalBudget >= 0.8) return 'near-limit';
  return 'on-track';
}

export function BudgetSummaryCard({ summary }: { summary: BudgetSummary }) {
  const theme = useAppTheme();
  const status = summaryStatus(summary);
  const remaining = summary.totalRemaining < 0
    ? `-${formatBase(Math.abs(summary.totalRemaining))}`
    : formatBase(summary.totalRemaining);
  return (
    <Card
      accessibilityLabel={`Total monthly budget ${formatBase(summary.totalBudget)}, spent ${formatBase(summary.totalSpent)}, remaining ${remaining}, ${summary.percentageUsed}% used`}
      style={styles.card}
      variant="raised">
      <Overline>Total monthly budget</Overline>
      <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[styles.total, { color: theme.primaryAction }]}>{formatBase(summary.totalBudget)}</Text>
      <View style={styles.amounts}>
        <SummaryAmount label="Spent" value={formatBase(summary.totalSpent)} />
        <SummaryAmount label={summary.totalRemaining < 0 ? 'Over by' : 'Remaining'} destructive={summary.totalRemaining < 0} value={summary.totalRemaining < 0 ? formatBase(Math.abs(summary.totalRemaining)) : remaining} />
      </View>
      <View style={styles.progressLabelRow}>
        <Text style={[styles.progressLabel, { color: theme.secondaryText }]}>Overall progress</Text>
        <Text style={[styles.progressValue, { color: status === 'over-budget' ? theme.destructive : theme.primaryText }]}>{summary.percentageUsed}%</Text>
      </View>
      <BudgetProgressBar percentage={summary.percentageUsed} progressWidth={summary.progressWidth} status={status} />
      {/* Without this the total looks wrong to anyone who budgeted a subcategory
          and expected its limit to be added on top of its category's. */}
      {summary.nestedCount > 0 ? (
        <Text style={[styles.note, { color: theme.mutedText }]}>
          {summary.nestedCount === 1
            ? '1 sub-limit is counted inside its category, not added to the total.'
            : `${summary.nestedCount} sub-limits are counted inside their categories, not added to the total.`}
        </Text>
      ) : null}
    </Card>
  );
}

function SummaryAmount({ label, value, destructive = false }: { label: string; value: string; destructive?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={styles.summaryAmount}>
      <Overline>{label}</Overline>
      <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[styles.amountValue, { color: destructive ? theme.destructive : theme.primaryText }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  total: { ...typography.moneyHero },
  amounts: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', marginTop: spacing.sm },
  summaryAmount: { flex: 1, gap: spacing.xs - 2, minWidth: 0 },
  amountValue: { ...typography.moneyRow, fontSize: 15, lineHeight: 20 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  progressLabel: { ...typography.caption },
  progressValue: { ...typography.captionStrong },
  note: { ...typography.label, marginTop: spacing.xs },
});
