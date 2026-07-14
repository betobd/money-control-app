import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, spacing, typography } from '@/constants/theme';
import type { BudgetStatus } from '@/features/budgets/budget.types';
import { useAppTheme } from '@/hooks/use-app-theme';

export function BudgetStatusBadge({ status }: { status: BudgetStatus }) {
  const theme = useAppTheme();
  const presentation = getStatusPresentation(status, theme);

  return (
    <View style={[styles.badge, { backgroundColor: presentation.background }]}>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        numberOfLines={1}
        style={[styles.label, { color: presentation.foreground }]}>
        {presentation.label}
      </Text>
    </View>
  );
}

export function getStatusPresentation(status: BudgetStatus, theme: ReturnType<typeof useAppTheme>) {
  if (status === 'near-limit') {
    return { label: 'Near limit', foreground: theme.warning, background: theme.elevatedSurface, accent: theme.warning };
  }
  if (status === 'over-budget') {
    return { label: 'Over budget', foreground: theme.destructive, background: theme.elevatedSurface, accent: theme.destructive };
  }
  if (status === 'fully-used') {
    return { label: 'Fully used', foreground: theme.secondaryText, background: theme.elevatedSurface, accent: theme.secondaryText };
  }
  return {
    label: 'On track',
    foreground: theme.selectedNavigationForeground,
    background: theme.selectedNavigationBackground,
    accent: theme.primaryAction,
  };
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    flexShrink: 0,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    width: 88,
  },
  label: {
    ...typography.label,
  },
});
