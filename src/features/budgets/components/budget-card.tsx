import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { BudgetProgressBar } from '@/features/budgets/components/budget-progress-bar';
import { BudgetStatusBadge, getStatusPresentation } from '@/features/budgets/components/budget-status-badge';
import type { BudgetMock } from '@/features/budgets/budgets.mock';
import { useAppTheme } from '@/hooks/use-app-theme';

export function BudgetCard({ budget }: { budget: BudgetMock }) {
  const theme = useAppTheme();
  const presentation = getStatusPresentation(budget.status, theme);
  const borderColor = budget.status === 'over-budget' ? theme.destructive : theme.border;

  return (
    <View
      accessibilityLabel={`${budget.category}, ${presentation.label}, spent ${budget.spent} of ${budget.limit}, ${budget.remaining} remaining, ${budget.percentage}% used`}
      style={[styles.card, { backgroundColor: theme.surface, borderColor }]}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: theme.elevatedSurface }]}>
          <SymbolView name={budget.icon} size={22} tintColor={presentation.foreground} />
        </View>
        <Text numberOfLines={1} style={[styles.category, { color: theme.primaryText }]}>
          {budget.category}
        </Text>
        <BudgetStatusBadge status={budget.status} />
      </View>

      <View style={styles.amounts}>
        <View style={styles.spentColumn}>
          <Text style={[styles.metaLabel, { color: theme.mutedText }]}>Spent</Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            style={[styles.spent, { color: theme.primaryText }]}>
            {budget.spent} de {budget.limit}
          </Text>
        </View>
        <View style={styles.remainingColumn}>
          <Text style={[styles.metaLabel, { color: theme.mutedText }]}>Remaining</Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            style={[styles.remaining, { color: presentation.foreground }]}>
            {budget.remaining}
          </Text>
        </View>
      </View>

      <View style={styles.progressHeader}>
        <Text style={[styles.percentage, { color: theme.secondaryText }]}>
          {budget.percentage}% used
        </Text>
      </View>
      <BudgetProgressBar
        percentage={budget.percentage}
        progressWidth={budget.progressWidth}
        status={budget.status}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    gap: spacing.md,
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  icon: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    flexShrink: 0,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  category: {
    ...typography.body,
    flex: 1,
    fontWeight: '700',
    minWidth: 0,
  },
  amounts: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  spentColumn: {
    flex: 1,
    minWidth: 0,
  },
  remainingColumn: {
    alignItems: 'flex-end',
    flexShrink: 0,
    width: 100,
  },
  metaLabel: {
    ...typography.label,
  },
  spent: {
    ...typography.caption,
    fontWeight: '700',
  },
  remaining: {
    ...typography.caption,
    fontWeight: '700',
    textAlign: 'right',
    width: '100%',
  },
  progressHeader: {
    flexDirection: 'row',
  },
  percentage: {
    ...typography.label,
  },
});
