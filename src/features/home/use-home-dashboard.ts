import { useCallback, useState } from 'react';

import type { CurrencyCode } from '@/features/currency/currency';
import { getBaseCurrency } from '@/features/settings/settings';

import { accountService } from '@/features/accounts/accounts';
import type { EstimatedNetWorth } from '@/features/accounts/account.service';
import type { BudgetSummary, BudgetView } from '@/features/budgets/budget.types';
import type { MonthlyBudgetView } from '@/features/budgets/monthly-budget.types';
import { budgetService } from '@/features/budgets/budgets';
import { exchangeRateService, loadValuationRates } from '@/features/exchange-rates/exchange-rates';
import { withInvestmentCurrentValues } from '@/features/investments/investment-portfolio.service';
import { investmentPortfolioService } from '@/features/investments/investments';
import type { InvestmentPortfolioSummary } from '@/features/investments/investment.types';
import { bogotaToday, monthFromDate } from '@/features/transactions/transaction-date';
import { transactionService } from '@/features/transactions/transactions';
import type { MonthlyTransactionSummary, TransactionListItem } from '@/features/transactions/transaction.types';
import { toUserMessage } from '@/errors/user-error';
import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';
import { getMessages } from '@/i18n/messages';

type State = {
  netWorth: EstimatedNetWorth;
  summary: MonthlyTransactionSummary;
  recent: TransactionListItem[];
  budget: BudgetSummary;
  budgets: BudgetView[];
  ceiling: MonthlyBudgetView | null;
  investments: InvestmentPortfolioSummary;
};

function emptyInvestments(base: CurrencyCode): InvestmentPortfolioSummary {
  return {
    accounts: [],
    investmentAccountCount: 0,
    baseCurrency: base,
    totalCurrentValueBaseMinor: 0,
    netContributionsBaseMinor: 0,
    estimatedGainLossBaseMinor: 0,
    estimatedReturn: { available: false },
    lockedOrRestrictedValueBaseMinor: 0,
    incomplete: false,
    allocationByType: [],
    allocationByCurrency: [],
  };
}

const emptyBudget: BudgetSummary = {
  totalBudget: 0,
  totalSpent: 0,
  totalRemaining: 0,
  percentageUsed: 0,
  progressWidth: '0%',
  nestedCount: 0,
};

export function useHomeDashboard() {
  const [data, setData] = useState<State>({
    netWorth: { totalBaseMinor: 0, baseCurrency: getBaseCurrency(), incomplete: false, includesForeign: false, missingCurrencies: [] },
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
    ceiling: null,
    investments: emptyInvestments(getBaseCurrency()),
  });
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string>();
  // Selected month. Home's month-scoped read models (summary, budgets) follow it;
  // net worth and recent transactions are point-in-time and deliberately do not.
  const [month, setMonth] = useState(() => monthFromDate(bogotaToday()));
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
      const currencies = accounts.map((account) => account.currency);
      const rates = await loadValuationRates();
      if (currencies.some((currency) => currency !== rates.baseCurrency)) {
        void exchangeRateService.ensureFreshRates(currencies);
      }
      const investments = await investmentPortfolioService.getPortfolio(rates);
      setData({
        // Net worth counts investment accounts at their current valuation, not their
        // transaction-derived balance (one source per account, no double counting).
        netWorth: accountService.estimateNetWorth(
          withInvestmentCurrentValues(accounts, investments.accounts),
          rates,
        ),
        summary,
        recent,
        budget: budget.summary,
        budgets: budget.budgets,
        ceiling: budget.ceiling,
        investments,
      });
      setHasLoaded(true);
    } catch (cause) {
      setError(toUserMessage(cause, getMessages().home.loadError));
    } finally {
      setLoading(false);
    }
  }, [month]);
  useFinancialDataRefresh(reload);
  return { ...data, month, setMonth, loading, hasLoaded, error, reload };
}
