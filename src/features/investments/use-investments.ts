import { useCallback, useState } from 'react';

import { toUserMessage } from '@/errors/user-error';
import { exchangeRateService, loadValuationRates } from '@/features/exchange-rates/exchange-rates';
import { getBaseCurrency } from '@/features/settings/settings';
import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';
import { investmentPortfolioService, investmentValuationService } from './investments';
import type { InvestmentAccountView, InvestmentPortfolioSummary, InvestmentValuation } from './investment.types';

const emptyPortfolio: InvestmentPortfolioSummary = {
  accounts: [],
  investmentAccountCount: 0,
  baseCurrency: getBaseCurrency(),
  totalCurrentValueBaseMinor: 0,
  netContributionsBaseMinor: 0,
  estimatedGainLossBaseMinor: 0,
  estimatedReturn: { available: false },
  lockedOrRestrictedValueBaseMinor: 0,
  incomplete: false,
  allocationByType: [],
  allocationByCurrency: [],
};

/** Portfolio read model for the Investments screen and the Home summary card. */
export function useInvestments() {
  const [portfolio, setPortfolio] = useState<InvestmentPortfolioSummary>(emptyPortfolio);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const rates = await loadValuationRates();
      const summary = await investmentPortfolioService.getPortfolio(rates);
      setPortfolio(summary);
      const currencies = summary.accounts.map((view) => view.account.currency);
      if (currencies.some((currency) => currency !== rates.baseCurrency)) {
        void exchangeRateService.ensureFreshRates(currencies);
      }
    } catch (cause) {
      setError(toUserMessage(cause, 'Unable to load investments right now.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFinancialDataRefresh(load);

  return { portfolio, loading, error, reload: load };
}

/** Detail read model for one investment account: view + valuation history. */
export function useInvestmentDetails(accountId: string) {
  const [view, setView] = useState<InvestmentAccountView | null>(null);
  const [valuations, setValuations] = useState<InvestmentValuation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const rates = await loadValuationRates();
      const [loadedView, loadedValuations] = await Promise.all([
        investmentPortfolioService.getAccountView(accountId, rates),
        investmentValuationService.list(accountId),
      ]);
      setView(loadedView);
      setValuations(loadedValuations);
      if (loadedView && loadedView.account.currency !== rates.baseCurrency) {
        void exchangeRateService.ensureFreshRates([loadedView.account.currency]);
      }
    } catch (cause) {
      setError(toUserMessage(cause, 'Unable to load this investment right now.'));
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useFinancialDataRefresh(load);

  return { view, valuations, loading, error, reload: load };
}
