import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type FilterIcon = 'category' | 'account' | 'date' | 'type' | 'status';

const filterIcons: Record<FilterIcon, SymbolViewProps['name']> = {
  category: { ios: 'square.grid.2x2.fill', android: 'category', web: 'category' },
  account: { ios: 'creditcard.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' },
  date: { ios: 'calendar', android: 'date_range', web: 'date_range' },
  type: { ios: 'arrow.left.arrow.right.square.fill', android: 'swap_vert', web: 'swap_vert' },
  status: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
};

type AppliedFilterBadgeProps = {
  accessibilityLabel: string;
  icon: FilterIcon;
  label: string;
};

export function AppliedFilterBadge({
  accessibilityLabel,
  icon,
  label,
}: AppliedFilterBadgeProps) {
  const theme = useAppTheme();
  const foreground = theme.primaryAction;

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      style={[styles.chip, { backgroundColor: theme.tintPrimary }]}>
      <SymbolView name={filterIcons[icon]} size={15} tintColor={foreground} />
      <Text numberOfLines={1} style={[styles.label, { color: foreground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    flexDirection: 'row',
    gap: spacing.xs,
    maxWidth: '100%',
    minHeight: 34,
    paddingHorizontal: spacing.sm + spacing.xs,
  },
  label: {
    ...typography.label,
    flexShrink: 1,
  },
});
