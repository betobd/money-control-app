import { useCallback, useRef, useState } from 'react';

import { budgetService } from '@/features/budgets/budgets';
import { toUserMessage } from '@/errors/user-error';
import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';
import { monthsBetween } from './report-insights';
import type { BudgetLimitForPeriod, ReportPeriod } from './report.types';

/**
 * Category budget limits that apply to a report period.
 *
 * Budgets are monthly, while a report period is an arbitrary range, so limits
 * are summed across every month the period touches. A period covering part of a
 * month still counts that month's whole limit — a budget is not prorated, and
 * inventing a daily rate would misrepresent the user's own plan. `monthCount`
 * is returned so the UI can say how many months are included.
 *
 * Lives in the reports feature rather than the report service because it reads
 * another feature's read model; the screen already composes investments the
 * same way.
 */
export function useReportBudgets(period: ReportPeriod | undefined) {
  const [limits, setLimits] = useState<BudgetLimitForPeriod[]>([]);
  const [monthCount, setMonthCount] = useState(0);
  const [error, setError] = useState<string>();
  const sequence = useRef(0);
  const dateFrom = period?.dateFrom;
  const dateTo = period?.dateTo;

  const load = useCallback(async () => {
    if (!dateFrom || !dateTo) {
      setLimits([]);
      setMonthCount(0);
      return;
    }
    const request = ++sequence.current;
    setError(undefined);
    try {
      const months = monthsBetween(dateFrom, dateTo);
      const views = await Promise.all(months.map((month) => budgetService.listMonth(month)));
      if (request !== sequence.current) return;

      const totals = new Map<string, BudgetLimitForPeriod>();
      for (const view of views) {
        for (const budget of view.budgets) {
          const existing = totals.get(budget.categoryId);
          if (existing) {
            existing.limitAmount += budget.limitAmount;
            existing.monthCount += 1;
          } else {
            totals.set(budget.categoryId, {
              categoryId: budget.categoryId,
              categoryName: budget.categoryName,
              icon: budget.categoryIcon,
              limitAmount: budget.limitAmount,
              monthCount: 1,
            });
          }
        }
      }
      setLimits([...totals.values()]);
      setMonthCount(months.length);
    } catch (cause) {
      if (request === sequence.current) {
        setError(toUserMessage(cause, 'Unable to load budgets for this period.'));
      }
    }
  }, [dateFrom, dateTo]);

  useFinancialDataRefresh(load);

  return { limits, monthCount, error };
}
