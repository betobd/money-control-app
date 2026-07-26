import { useCallback, useState } from 'react';

import { accountService } from '@/features/accounts/accounts';
import type { EstimatedNetWorth } from '@/features/accounts/account.service';
import type { BudgetSummary, BudgetView } from '@/features/budgets/budget.types';
import { budgetService } from '@/features/budgets/budgets';
import { exchangeRateService } from '@/features/exchange-rates/exchange-rates';
import { withInvestmentCurrentValues } from '@/features/investments/investment-portfolio.service';
import { investmentPortfolioService } from '@/features/investments/investments';
import type { InvestmentPortfolioSummary } from '@/features/investments/investment.types';
import { bogotaToday, monthFromDate } from '@/features/transactions/transaction-date';
import { transactionService } from '@/features/transactions/transactions';
import type { MonthlyTransactionSummary, TransactionListItem } from '@/features/transactions/transaction.types';
import { toUserMessage } from '@/errors/user-error';
import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';

type State = {
  netWorth: EstimatedNetWorth;
  summary: MonthlyTransactionSummary;
  recent: TransactionListItem[];
  budget: BudgetSummary;
  budgets: BudgetView[];
  investments: InvestmentPortfolioSummary;
};

const emptyInvestments: InvestmentPortfolioSummary = {
  accounts: [],
  investmentAccountCount: 0,
  totalCurrentValueCopMinor: 0,
  netContributionsCopMinor: 0,
  estimatedGainLossCopMinor: 0,
  estimatedReturn: { available: false },
  lockedOrRestrictedValueCopMinor: 0,
  incomplete: false,
  allocationByType: [],
  allocationByCurrency: [],
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
    netWorth: { totalCopMinor: 0, incomplete: false, includesForeign: false },
    summary: {
      income: 0,
      grossExpenses: 0,
      refunds: 0,
      netExpenses: 0,
      net: 0,
    },
    recent: [],
    budget: emptyBudget,
    budgets: [],
    investments: emptyInvestments,
  });
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string>();
  const month = monthFromDate(bogotaToday());
  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [accounts, rateStatus, summary, recent, budget] = await Promise.all([
        accountService.list(true),
        exchangeRateService.getStatus(),
        transactionService.summarizeMonth(month),
        transactionService.recent(3),
        budgetService.listMonth(month),
      ]);
      const valuationRate = rateStatus.rate
        ? { rateScaled: rateStatus.rate.rateScaled, rateScale: rateStatus.rate.rateScale }
        : null;
      if (accounts.some((account) => account.currency !== 'COP')) {
        void exchangeRateService.ensureFreshRate();
      }
      const investments = await investmentPortfolioService.getPortfolio(valuationRate);
      setData({
        // Net worth counts investment accounts at their current valuation, not their
        // transaction-derived balance (one source per account, no double counting).
        netWorth: accountService.estimateNetWorth(
          withInvestmentCurrentValues(accounts, investments.accounts),
          valuationRate,
        ),
        summary,
        recent,
        budget: budget.summary,
        budgets: budget.budgets,
        investments,
      });
      setHasLoaded(true);
    } catch (cause) {
      setError(toUserMessage(cause, 'Unable to load your dashboard right now.'));
    } finally {
      setLoading(false);
    }
  }, [month]);
  useFinancialDataRefresh(reload);
  return { ...data, month, loading, hasLoaded, error, reload };
}
