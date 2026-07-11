import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type FilterIcon = 'category' | 'account' | 'date';

const filterIcons: Record<FilterIcon, SymbolViewProps['name']> = {
  category: { ios: 'square.grid.2x2.fill', android: 'category', web: 'category' },
  account: { ios: 'creditcard.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' },
  date: { ios: 'calendar', android: 'date_range', web: 'date_range' },
};

type FilterChipProps = {
  icon: FilterIcon;
  label: string;
  selected?: boolean;
};

export function FilterChip({ icon, label, selected = false }: FilterChipProps) {
  const theme = useAppTheme();
  const foreground = selected
    ? theme.selectedNavigationForeground
    : theme.secondaryText;

  return (
    <Pressable
      accessibilityHint="Filtering is not active in this preview"
      accessibilityLabel={`Filter by ${label}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => undefined}
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? theme.selectedNavigationBackground
            : theme.surface,
          borderColor: selected ? theme.primaryAction : theme.border,
        },
      ]}>
      <SymbolView name={filterIcons[icon]} size={18} tintColor={foreground} />
      <Text style={[styles.label, { color: foreground }]}>{label}</Text>
      <SymbolView
        name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
        size={18}
        tintColor={foreground}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    borderWidth: borderWidths.thin,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});
