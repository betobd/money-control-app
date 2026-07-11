import { StyleSheet, View } from 'react-native';

import { borderRadii } from '@/constants/theme';
import { getStatusPresentation } from '@/features/budgets/components/budget-status-badge';
import type { BudgetStatus, ProgressWidth } from '@/features/budgets/budgets.mock';
import { useAppTheme } from '@/hooks/use-app-theme';

type BudgetProgressBarProps = {
  percentage: number;
  progressWidth: ProgressWidth;
  status: BudgetStatus;
};

export function BudgetProgressBar({ percentage, progressWidth, status }: BudgetProgressBarProps) {
  const theme = useAppTheme();
  const presentation = getStatusPresentation(status, theme);
  const fillColor =
    status === 'on-track' || status === 'fully-used'
      ? theme.progressFill
      : presentation.foreground;

  return (
    <View
      accessibilityLabel={`${presentation.label}, ${percentage}% used`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, now: percentage }}
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
