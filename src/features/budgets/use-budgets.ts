import { useCallback, useState } from 'react';

import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';
import { budgetService } from './budgets';
import type { BudgetMonthView } from './budget.types';

const empty: BudgetMonthView = {
  budgets: [],
  summary: {
    totalBudget: 0,
    totalSpent: 0,
    totalRemaining: 0,
    percentageUsed: 0,
    progressWidth: '0%',
  },
};

export function useBudgets(month: string) {
  const [data, setData] = useState<BudgetMonthView>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setData(await budgetService.listMonth(month));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load budgets.');
    } finally {
      setLoading(false);
    }
  }, [month]);
  useFinancialDataRefresh(reload);
  return { ...data, loading, error, reload };
}
