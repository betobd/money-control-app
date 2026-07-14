import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryScreenHeader } from '@/components/primary-screen-header';
import { ScreenContainer } from '@/components/screen-container';
import { borderRadii, spacing, typography } from '@/constants/theme';
import { budgetMonthLabel, currentBudgetMonth, shiftBudgetMonth } from '@/features/budgets/budget-month';
import { BudgetCard } from '@/features/budgets/components/budget-card';
import { BudgetErrorState, EmptyBudgetsState, LoadingBudgetCard } from '@/features/budgets/components/budget-states';
import { BudgetSummaryCard } from '@/features/budgets/components/budget-summary-card';
import { CreateBudgetButton } from '@/features/budgets/components/create-budget-button';
import { useBudgets } from '@/features/budgets/use-budgets';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function BudgetsScreen() {
  const theme = useAppTheme();
  const [month, setMonth] = useState(() => currentBudgetMonth());
  const data = useBudgets(month);
  const label = budgetMonthLabel(month);
  const openForm = (id?: string) => router.push({
    pathname: '/budget-form',
    params: { month, ...(id ? { id } : {}) },
  });

  return (
    <ScreenContainer contentStyle={styles.content}>
      <PrimaryScreenHeader />
      <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>Budgets</Text>

      <View accessibilityLabel={`Selected month, ${label}`} style={[styles.monthSelector, { backgroundColor: theme.elevatedSurface }]}>
        <Pressable accessibilityLabel="Previous month" accessibilityRole="button" onPress={() => setMonth((value) => shiftBudgetMonth(value, -1))} style={styles.monthButton}>
          <SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={20} tintColor={theme.secondaryText} />
        </Pressable>
        <Text style={[styles.month, { color: theme.primaryText }]}>{label}</Text>
        <Pressable accessibilityLabel="Next month" accessibilityRole="button" onPress={() => setMonth((value) => shiftBudgetMonth(value, 1))} style={styles.monthButton}>
          <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={20} tintColor={theme.secondaryText} />
        </Pressable>
      </View>

      {data.loading ? <><LoadingBudgetCard /><LoadingBudgetCard /></> : null}
      {!data.loading && data.error ? <BudgetErrorState message={data.error} onRetry={() => void data.reload()} /> : null}
      {!data.loading && !data.error && data.budgets.length === 0 ? <EmptyBudgetsState onCreate={() => openForm()} /> : null}

      {!data.loading && !data.error && data.budgets.length > 0 ? (
        <>
          <BudgetSummaryCard summary={data.summary} />
          <CreateBudgetButton onPress={() => openForm()} />
          <View style={styles.sectionHeader}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.primaryText }]}>Monthly budgets</Text>
            <Text style={[styles.sectionMonth, { color: theme.mutedText }]}>{label}</Text>
          </View>
          <View accessibilityLabel="Monthly category budgets" style={styles.budgets}>
            {data.budgets.map((budget) => <BudgetCard budget={budget} key={budget.id} onPress={() => openForm(budget.id)} />)}
          </View>
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  title: { ...typography.title },
  monthSelector: { alignItems: 'center', alignSelf: 'center', borderRadius: borderRadii.full, flexDirection: 'row', minHeight: 48 },
  monthButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  month: { ...typography.sectionTitle, minWidth: 132, textAlign: 'center' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { ...typography.sectionTitle },
  sectionMonth: { ...typography.caption },
  budgets: { gap: spacing.md },
});
