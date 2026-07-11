import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { BudgetProgressBar } from '@/features/budgets/components/budget-progress-bar';
import type { BudgetSummaryMock } from '@/features/budgets/budgets.mock';
import { useAppTheme } from '@/hooks/use-app-theme';

export function BudgetSummaryCard({ summary }: { summary: BudgetSummaryMock }) {
  const theme = useAppTheme();

  return (
    <View
      accessibilityLabel={`Total monthly budget ${summary.total}, spent ${summary.spent}, remaining ${summary.remaining}, ${summary.percentage}% used`}
      style={[styles.card, { backgroundColor: theme.elevatedSurface, borderColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>Total monthly budget</Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={1}
        style={[styles.total, { color: theme.primaryAction }]}>
        {summary.total}
      </Text>
      <View style={styles.amounts}>
        <SummaryAmount label="Spent" value={summary.spent} />
        <SummaryAmount label="Remaining" tone="remaining" value={summary.remaining} />
      </View>
      <View style={styles.progressLabelRow}>
        <Text style={[styles.progressLabel, { color: theme.secondaryText }]}>Overall progress</Text>
        <Text style={[styles.progressValue, { color: theme.primaryText }]}>{summary.percentage}%</Text>
      </View>
      <BudgetProgressBar
        percentage={summary.percentage}
        progressWidth={summary.progressWidth}
        status="on-track"
      />
    </View>
  );
}

function SummaryAmount({ label, value, tone }: { label: string; value: string; tone?: 'remaining' }) {
  const theme = useAppTheme();

  return (
    <View style={styles.summaryAmount}>
      <Text style={[styles.amountLabel, { color: theme.mutedText }]}>{label}</Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={1}
        style={[styles.amountValue, { color: tone === 'remaining' ? theme.income : theme.primaryText }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    gap: spacing.sm,
    padding: spacing.md,
  },
  label: {
    ...typography.label,
    textTransform: 'uppercase',
  },
  total: {
    ...typography.display,
    fontSize: 29,
    fontVariant: ['tabular-nums'],
    lineHeight: 36,
  },
  amounts: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  summaryAmount: {
    flex: 1,
    minWidth: 0,
  },
  amountLabel: {
    ...typography.label,
  },
  amountValue: {
    ...typography.body,
    fontWeight: '700',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  progressLabel: {
    ...typography.caption,
  },
  progressValue: {
    ...typography.caption,
    fontWeight: '700',
  },
});
