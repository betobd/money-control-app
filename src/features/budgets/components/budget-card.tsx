import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';

import { IconChip } from '@/components/icon-chip';
import { borderRadii, spacing, typography } from '@/constants/theme';
import { formatCop } from '@/features/accounts/account-format';
import { getCategoryIcon } from '@/features/categories/category-icons';
import { budgetMonthLabel } from '@/features/budgets/budget-month';
import { useBudgetColor } from '@/features/budgets/budget-color';
import { BudgetProgressBar } from '@/features/budgets/components/budget-progress-bar';
import { BudgetStatusBadge, getStatusPresentation } from '@/features/budgets/components/budget-status-badge';
import type { BudgetView } from '@/features/budgets/budget.types';
import { useAppTheme } from '@/hooks/use-app-theme';

type BudgetCardProps = {
  budget: BudgetView;
  onPress: () => void;
  /** Renders the compact form used for a sub-limit nested inside its category. */
  nested?: boolean;
};

export function BudgetCard({ budget, onPress, nested = false }: BudgetCardProps) {
  const theme = useAppTheme();
  const resolveColor = useBudgetColor();
  const presentation = getStatusPresentation(budget.status, theme);
  const accentColor = resolveColor(budget.color, presentation.accent);
  const overBudget = budget.remaining < 0;
  const remainingLabel = overBudget ? 'Over by' : 'Remaining';
  const remainingValue = overBudget ? formatCop(Math.abs(budget.remaining)) : formatCop(budget.remaining);

  return (
    <PressableScale
      accessibilityHint="Opens budget editing"
      accessibilityLabel={`${budget.categoryName}${budget.categoryIsArchived ? ', archived category' : ''}, ${presentation.label}, spent ${formatCop(budget.spent)} of ${formatCop(budget.limitAmount)}, ${remainingLabel.toLowerCase()} ${remainingValue}, ${budget.percentageUsed}% used`}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, nested && styles.nestedCard, { backgroundColor: nested ? theme.elevatedSurface : theme.surface }]}>
      <View style={styles.header}>
        <IconChip background={nested ? theme.surface : theme.elevatedSurface} color={accentColor} icon={getCategoryIcon(budget.categoryIcon)} iconSize={nested ? 16 : 19} size={nested ? 30 : 36} />
        <View style={styles.heading}>
          <Text numberOfLines={1} style={[styles.category, { color: theme.primaryText }]}>{budget.categoryName}</Text>
          <Text style={[styles.month, { color: theme.mutedText }]}>
            {/* Nested cards sit under their category, so repeating the month and
                the parent name there would just be noise. */}
            {nested
              ? `Sub-limit${budget.isRecurring ? ' · Monthly' : ''}`
              : `${budgetMonthLabel(budget.month)}${budget.isRecurring ? ' · Monthly' : ''}${budget.categoryParentName ? ` · in ${budget.categoryParentName}` : ''}`}
            {budget.categoryIsArchived ? ' · Archived category' : ''}
          </Text>
        </View>
        <BudgetStatusBadge status={budget.status} />
      </View>

      <View style={styles.amounts}>
        <View style={styles.spentColumn}>
          <Text style={[styles.metaLabel, { color: theme.mutedText }]}>Spent</Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[styles.spent, { color: theme.primaryText }]}>
            {formatCop(budget.spent)} of {formatCop(budget.limitAmount)}
          </Text>
        </View>
        <View style={styles.remainingColumn}>
          <Text style={[styles.metaLabel, { color: theme.mutedText }]}>{remainingLabel}</Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[styles.remaining, { color: presentation.accent }]}>
            {remainingValue}
          </Text>
        </View>
      </View>

      <Text style={[styles.percentage, { color: theme.secondaryText }]}>{budget.percentageUsed}% used</Text>
      <BudgetProgressBar color={budget.color} percentage={budget.percentageUsed} progressWidth={budget.progressWidth} status={budget.status} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: borderRadii.card, gap: spacing.sm + spacing.xs, padding: spacing.md },
  nestedCard: { borderRadius: borderRadii.md, gap: spacing.sm, padding: spacing.sm + spacing.xs },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm + 2 },
  heading: { flex: 1, minWidth: 0 },
  category: { ...typography.body, fontFamily: typography.sectionTitle.fontFamily, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  month: { ...typography.label, fontSize: 11, lineHeight: 15 },
  amounts: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  spentColumn: { flex: 1, minWidth: 0 },
  remainingColumn: { alignItems: 'flex-end', flexShrink: 0, width: 112 },
  metaLabel: { ...typography.overline },
  spent: { ...typography.moneyRow, fontSize: 13, lineHeight: 18 },
  remaining: { ...typography.moneyRow, fontSize: 13, lineHeight: 18, textAlign: 'right', width: '100%' },
  percentage: { ...typography.label },
});
