import { useCallback, useState } from 'react';

import { accountService } from '@/features/accounts/accounts';
import type { BudgetSummary } from '@/features/budgets/budget.types';
import { budgetService } from '@/features/budgets/budgets';
import { bogotaToday, monthFromDate } from '@/features/transactions/transaction-date';
import { transactionService } from '@/features/transactions/transactions';
import type { MonthlyTransactionSummary, TransactionListItem } from '@/features/transactions/transaction.types';
import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';

type State = {
  totalBalance: number;
  summary: MonthlyTransactionSummary;
  recent: TransactionListItem[];
  budget: BudgetSummary;
};

const emptyBudget: BudgetSummary = {
  totalBudget: 0,
  totalSpent: 0,
  totalRemaining: 0,
  percentageUsed: 0,
  progressWidth: '0%',
};

export function useHomeDashboard() {
  const [data, setData] = useState<State>({
    totalBalance: 0,
    summary: { income: 0, expenses: 0, net: 0 },
    recent: [],
    budget: emptyBudget,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const month = monthFromDate(bogotaToday());
  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [accounts, summary, recent, budget] = await Promise.all([
        accountService.list(true),
        transactionService.summarizeMonth(month),
        transactionService.recent(3),
        budgetService.listMonth(month),
      ]);
      setData({
        totalBalance: accountService.calculateNetWorth(accounts),
        summary,
        recent,
        budget: budget.summary,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [month]);
  useFinancialDataRefresh(reload);
  return { ...data, month, loading, error };
}
