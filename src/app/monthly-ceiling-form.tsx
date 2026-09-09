import { useLocalSearchParams } from 'expo-router';

import { currentBudgetMonth } from '@/features/budgets/budget-month';
import { MonthlyCeilingForm } from '@/features/budgets/components/monthly-ceiling-form';

export default function MonthlyCeilingFormRoute() {
  const { month } = useLocalSearchParams<{ month?: string }>();
  return <MonthlyCeilingForm month={month ?? currentBudgetMonth()} />;
}
