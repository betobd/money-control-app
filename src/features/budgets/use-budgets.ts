import { useCallback, useState } from 'react';

import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';
import { getMessages } from '@/i18n/messages';
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
  nestedCount: 0,
  },
  ceiling: null,
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
      setError(cause instanceof Error ? cause.message : getMessages().budgets.loadBudgetsError);
    } finally {
      setLoading(false);
    }
  }, [month]);
  useFinancialDataRefresh(reload);
  return { ...data, loading, error, reload };
}
