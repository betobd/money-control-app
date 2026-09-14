import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, spacing, typography } from '@/constants/theme';
import type { BudgetStatus } from '@/features/budgets/budget.types';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { Messages } from '@/i18n/messages';
import { useMessages } from '@/i18n/use-messages';

export function BudgetStatusBadge({ status }: { status: BudgetStatus }) {
  const theme = useAppTheme();
  const t = useMessages();
  const presentation = getStatusPresentation(status, theme, t);

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

export function getStatusPresentation(status: BudgetStatus, theme: ReturnType<typeof useAppTheme>, t: Messages) {
  const label = t.budgets.status[status];
  if (status === 'near-limit') {
    return { label, foreground: theme.warning, background: theme.tintWarning, accent: theme.warning };
  }
  if (status === 'over-budget') {
    return { label, foreground: theme.destructive, background: theme.tintDestructive, accent: theme.destructive };
  }
  if (status === 'fully-used') {
    return { label, foreground: theme.secondaryText, background: theme.elevatedSurface, accent: theme.secondaryText };
  }
  return {
    label,
    foreground: theme.primaryAction,
    background: theme.tintPrimary,
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
