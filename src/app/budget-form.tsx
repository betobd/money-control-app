import { useLocalSearchParams } from 'expo-router';

import { currentBudgetMonth } from '@/features/budgets/budget-month';
import { BudgetForm } from '@/features/budgets/components/budget-form';

export default function BudgetFormRoute() {
  const { id, month } = useLocalSearchParams<{ id?: string; month?: string }>();
  return <BudgetForm budgetId={id} initialMonth={month ?? currentBudgetMonth()} />;
}
