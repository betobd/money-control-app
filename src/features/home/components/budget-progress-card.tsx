import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type BudgetProgressCardProps = {
  label: string;
  percentage: number;
};

export function BudgetProgressCard({ label, percentage }: BudgetProgressCardProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.primaryText }]}>Monthly budget</Text>
          <Text style={[styles.label, { color: theme.secondaryText }]}>{label}</Text>
        </View>
        <View
          accessibilityLabel={`Monthly budget, ${label}`}
          accessibilityRole="progressbar"
          accessibilityValue={{ max: 100, min: 0, now: percentage }}
          style={[styles.badge, { backgroundColor: theme.selectedNavigationBackground }]}>
          <Text style={[styles.percentage, { color: theme.selectedNavigationForeground }]}>{percentage}%</Text>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: theme.progressTrack }]}>
        <View style={[styles.fill, { backgroundColor: theme.progressFill, width: `${percentage}%` }]} />
      </View>
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
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.sectionTitle,
  },
  label: {
    ...typography.body,
  },
  badge: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  percentage: {
    ...typography.label,
  },
  track: {
    borderRadius: borderRadii.full,
    height: 8,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: borderRadii.full,
    height: '100%',
  },
});
