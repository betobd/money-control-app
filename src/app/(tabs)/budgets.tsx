import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryScreenHeader } from '@/components/primary-screen-header';
import { ScreenContainer } from '@/components/screen-container';
import { borderRadii, spacing, typography } from '@/constants/theme';
import { budgetMonthLabel, currentBudgetMonth, shiftBudgetMonth } from '@/features/budgets/budget-month';
import { groupBudgets } from '@/features/budgets/budget.service';
import { BudgetCard } from '@/features/budgets/components/budget-card';
import { BudgetErrorState, EmptyBudgetsState, LoadingBudgetCard } from '@/features/budgets/components/budget-states';
import { BudgetSummaryCard } from '@/features/budgets/components/budget-summary-card';
import { MonthlyCeilingCard, MonthlyCeilingEmptyCard } from '@/features/budgets/components/monthly-ceiling-card';
import { useBudgets } from '@/features/budgets/use-budgets';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';

export default function BudgetsScreen() {
  const theme = useAppTheme();
  const [month, setMonth] = useState(() => currentBudgetMonth());
  const data = useBudgets(month);
  const pullToRefresh = usePullToRefresh(data.reload);
  const label = budgetMonthLabel(month);
  const openForm = (id?: string) => router.push({
    pathname: '/budget-form',
    params: { month, ...(id ? { id } : {}) },
  });
  const openCeilingForm = () => router.push({ pathname: '/monthly-ceiling-form', params: { month } });

  return (
    <ScreenContainer contentStyle={styles.content} {...pullToRefresh}>
      <PrimaryScreenHeader onAdd={{ accessibilityLabel: 'Create budget', onPress: () => openForm() }} title="Budgets" />

      <View accessibilityLabel={`Selected month, ${label}`} style={[styles.monthSelector, { backgroundColor: theme.elevatedSurface }]}>
        <Pressable accessibilityLabel="Previous month" accessibilityRole="button" onPress={() => setMonth((value) => shiftBudgetMonth(value, -1))} style={styles.monthButton}>
          <SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={18} tintColor={theme.secondaryText} />
        </Pressable>
        <Text style={[styles.month, { color: theme.primaryText }]}>{label}</Text>
        <Pressable accessibilityLabel="Next month" accessibilityRole="button" onPress={() => setMonth((value) => shiftBudgetMonth(value, 1))} style={styles.monthButton}>
          <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={18} tintColor={theme.secondaryText} />
        </Pressable>
      </View>

      {data.loading ? <><LoadingBudgetCard /><LoadingBudgetCard /></> : null}
      {!data.loading && data.error ? <BudgetErrorState message={data.error} onRetry={() => void data.reload()} /> : null}

      {!data.loading && !data.error ? (
        data.ceiling
          ? <MonthlyCeilingCard ceiling={data.ceiling} onEdit={openCeilingForm} />
          : <MonthlyCeilingEmptyCard onCreate={openCeilingForm} />
      ) : null}

      {!data.loading && !data.error && data.budgets.length === 0 ? <EmptyBudgetsState onCreate={() => openForm()} /> : null}

      {!data.loading && !data.error && data.budgets.length > 0 ? (
        <>
          <BudgetSummaryCard summary={data.summary} />
          <View style={styles.sectionHeader}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.primaryText }]}>Monthly budgets</Text>
            <Text style={[styles.sectionMonth, { color: theme.mutedText }]}>{label}</Text>
          </View>
          <View accessibilityLabel="Monthly category budgets" style={styles.budgets}>
            {groupBudgets(data.budgets).map((group) => (
              <View key={group.budget.id} style={styles.group}>
                <BudgetCard budget={group.budget} onPress={() => openForm(group.budget.id)} />
                {group.children.length ? (
                  <View style={styles.subLimits}>
                    {group.children.map((child) => (
                      <BudgetCard budget={child} key={child.id} nested onPress={() => openForm(child.id)} />
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  monthSelector: { alignItems: 'center', alignSelf: 'center', borderRadius: borderRadii.full, flexDirection: 'row', minHeight: 40 },
  monthButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  month: { ...typography.sectionTitle, fontSize: 14, lineHeight: 19, minWidth: 128, textAlign: 'center' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { ...typography.sectionTitle, fontSize: 15, lineHeight: 20 },
  sectionMonth: { ...typography.caption },
  budgets: { gap: spacing.sm + spacing.xs },
  group: { gap: spacing.xs + 2 },
  subLimits: { gap: spacing.xs + 2, paddingLeft: spacing.md },
});
