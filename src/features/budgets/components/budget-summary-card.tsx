import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { formatCop } from '@/features/accounts/account-format';
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
    ? `-${formatCop(Math.abs(summary.totalRemaining))}`
    : formatCop(summary.totalRemaining);
  return (
    <View accessibilityLabel={`Total monthly budget ${formatCop(summary.totalBudget)}, spent ${formatCop(summary.totalSpent)}, remaining ${remaining}, ${summary.percentageUsed}% used`} style={[styles.card, { backgroundColor: theme.elevatedSurface, borderColor: status === 'over-budget' ? theme.destructive : theme.border }]}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>Total monthly budget</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[styles.total, { color: theme.primaryAction }]}>{formatCop(summary.totalBudget)}</Text>
      <View style={styles.amounts}>
        <SummaryAmount label="Spent" value={formatCop(summary.totalSpent)} />
        <SummaryAmount label={summary.totalRemaining < 0 ? 'Over by' : 'Remaining'} destructive={summary.totalRemaining < 0} value={summary.totalRemaining < 0 ? formatCop(Math.abs(summary.totalRemaining)) : remaining} />
      </View>
      <View style={styles.progressLabelRow}>
        <Text style={[styles.progressLabel, { color: theme.secondaryText }]}>Overall progress</Text>
        <Text style={[styles.progressValue, { color: status === 'over-budget' ? theme.destructive : theme.primaryText }]}>{summary.percentageUsed}%</Text>
      </View>
      <BudgetProgressBar percentage={summary.percentageUsed} progressWidth={summary.progressWidth} status={status} />
    </View>
  );
}

function SummaryAmount({ label, value, destructive = false }: { label: string; value: string; destructive?: boolean }) {
  const theme = useAppTheme();
  return <View style={styles.summaryAmount}><Text style={[styles.amountLabel, { color: theme.mutedText }]}>{label}</Text><Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[styles.amountValue, { color: destructive ? theme.destructive : theme.primaryText }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, gap: spacing.sm, padding: spacing.md },
  label: { ...typography.label, textTransform: 'uppercase' },
  total: { ...typography.display, fontSize: 29, fontVariant: ['tabular-nums'], lineHeight: 36 },
  amounts: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', marginTop: spacing.sm },
  summaryAmount: { flex: 1, minWidth: 0 },
  amountLabel: { ...typography.label },
  amountValue: { ...typography.body, fontWeight: '700' },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  progressLabel: { ...typography.caption },
  progressValue: { ...typography.caption, fontWeight: '700' },
});
