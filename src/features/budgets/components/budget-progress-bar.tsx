import { StyleSheet, View } from 'react-native';

import { borderRadii, type BudgetColorKey } from '@/constants/theme';
import { useBudgetColor } from '@/features/budgets/budget-color';
import { getStatusPresentation } from '@/features/budgets/components/budget-status-badge';
import type { BudgetStatus, ProgressWidth } from '@/features/budgets/budget.types';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

type BudgetProgressBarProps = {
  percentage: number;
  progressWidth: ProgressWidth;
  status: BudgetStatus;
  color?: BudgetColorKey | null;
};

export function BudgetProgressBar({ percentage, progressWidth, status, color = null }: BudgetProgressBarProps) {
  const theme = useAppTheme();
  const t = useMessages();
  const resolveColor = useBudgetColor();
  const presentation = getStatusPresentation(status, theme, t);
  // Red only when over budget; otherwise the budget keeps its assigned color.
  const fillColor =
    status === 'over-budget'
      ? theme.destructive
      : resolveColor(color, theme.progressFill);

  return (
    <View
      accessibilityLabel={t.budgets.progressAccessibility(presentation.label, percentage)}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: Math.max(0, Math.min(percentage, 100)) }}
      style={[styles.track, { backgroundColor: theme.progressTrack }]}>
      <View style={[styles.fill, { backgroundColor: fillColor, width: progressWidth }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: borderRadii.full,
    height: 8,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: borderRadii.full,
    height: '100%',
    maxWidth: '100%',
  },
});
