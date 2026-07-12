import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { PrimaryScreenHeader } from '@/components/primary-screen-header';
import { borderRadii, spacing, typography } from '@/constants/theme';
import { BudgetCard } from '@/features/budgets/components/budget-card';
import { BudgetSummaryCard } from '@/features/budgets/components/budget-summary-card';
import { CreateBudgetButton } from '@/features/budgets/components/create-budget-button';
import { budgetsOverviewMock } from '@/features/budgets/budgets.mock';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function BudgetsScreen() {
  const theme = useAppTheme();

  return (
    <ScreenContainer contentStyle={styles.content}>
      <PrimaryScreenHeader />

      <View style={styles.headingRow}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>
          Budgets
        </Text>
        <View
          accessibilityLabel={`Selected month, ${budgetsOverviewMock.month}`}
          style={[styles.month, { backgroundColor: theme.elevatedSurface }]}>
          <SymbolView
            name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
            size={18}
            tintColor={theme.secondaryText}
          />
          <Text style={[styles.monthText, { color: theme.secondaryText }]}>
            {budgetsOverviewMock.month}
          </Text>
        </View>
      </View>

      <BudgetSummaryCard summary={budgetsOverviewMock.summary} />
      <CreateBudgetButton />

      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.primaryText }]}>
          Active budgets
        </Text>
        <Text style={[styles.sectionMonth, { color: theme.mutedText }]}>
          {budgetsOverviewMock.month}
        </Text>
      </View>

      <View accessibilityLabel="Active category budgets" style={styles.budgets}>
        {budgetsOverviewMock.budgets.map((budget) => (
          <BudgetCard budget={budget} key={budget.id} />
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  title: {
    ...typography.title,
  },
  month: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  monthText: {
    ...typography.caption,
    fontWeight: '700',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.sectionTitle,
  },
  sectionMonth: {
    ...typography.caption,
  },
  budgets: {
    gap: spacing.md,
  },
});
