import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { BudgetCard } from '@/features/budgets/components/budget-card';
import { fullyUsedBudgetMock, nearLimitBudgetMock, overBudgetMock } from '@/features/budgets/budgets.mock';
import { useAppTheme } from '@/hooks/use-app-theme';

export function EmptyBudgetsState() {
  const theme = useAppTheme();

  return (
    <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.elevatedSurface }]}>
        <SymbolView
          name={{ ios: 'chart.bar', android: 'monitoring', web: 'monitoring' }}
          size={28}
          tintColor={theme.secondaryText}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No budgets yet</Text>
      <Text style={[styles.emptyBody, { color: theme.secondaryText }]}>Create a category budget to plan monthly spending.</Text>
    </View>
  );
}

export function LoadingBudgetCard() {
  const theme = useAppTheme();

  return (
    <View
      accessibilityLabel="Loading budget"
      accessibilityRole="progressbar"
      style={[styles.loading, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.loadingHeader}>
        <View style={[styles.loadingIcon, { backgroundColor: theme.disabledSurface }]} />
        <View style={[styles.loadingTitle, { backgroundColor: theme.disabledSurface }]} />
      </View>
      <View style={[styles.loadingAmount, { backgroundColor: theme.disabledSurface }]} />
      <View style={[styles.loadingBar, { backgroundColor: theme.disabledSurface }]} />
    </View>
  );
}

export function CompletedBudgetState() {
  return <BudgetCard budget={fullyUsedBudgetMock} />;
}

export function NearLimitBudgetState() {
  return <BudgetCard budget={nearLimitBudgetMock} />;
}

export function OverBudgetState() {
  return <BudgetCard budget={overBudgetMock} />;
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  emptyTitle: {
    ...typography.sectionTitle,
  },
  emptyBody: {
    ...typography.body,
    textAlign: 'center',
  },
  loading: {
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    gap: spacing.md,
    minHeight: 176,
    padding: spacing.md,
  },
  loadingHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  loadingIcon: {
    borderRadius: borderRadii.full,
    height: 40,
    width: 40,
  },
  loadingTitle: {
    borderRadius: borderRadii.sm,
    height: 18,
    width: '54%',
  },
  loadingAmount: {
    borderRadius: borderRadii.sm,
    height: 20,
    width: '70%',
  },
  loadingBar: {
    borderRadius: borderRadii.full,
    height: 8,
    marginTop: spacing.sm,
    width: '100%',
  },
});
