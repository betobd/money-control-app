import { useCallback, useState } from 'react';

import { toUserMessage } from '@/errors/user-error';
import { exchangeRateService } from '@/features/exchange-rates/exchange-rates';
import type { ScaledRate } from '@/features/currency/currency';
import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';
import { investmentPortfolioService, investmentValuationService } from './investments';
import type { InvestmentAccountView, InvestmentPortfolioSummary, InvestmentValuation } from './investment.types';

const emptyPortfolio: InvestmentPortfolioSummary = {
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

async function resolveValuationRate(): Promise<ScaledRate | null> {
  const status = await exchangeRateService.getStatus();
  return status.rate ? { rateScaled: status.rate.rateScaled, rateScale: status.rate.rateScale } : null;
}

/** Portfolio read model for the Investments screen and the Home summary card. */
export function useInvestments() {
  const [portfolio, setPortfolio] = useState<InvestmentPortfolioSummary>(emptyPortfolio);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const rate = await resolveValuationRate();
      const summary = await investmentPortfolioService.getPortfolio(rate);
      setPortfolio(summary);
      if (summary.accounts.some((view) => view.account.currency !== 'COP')) {
        void exchangeRateService.ensureFreshRate();
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
      const rate = await resolveValuationRate();
      const [loadedView, loadedValuations] = await Promise.all([
        investmentPortfolioService.getAccountView(accountId, rate),
        investmentValuationService.list(accountId),
      ]);
      setView(loadedView);
      setValuations(loadedValuations);
      if (loadedView && loadedView.account.currency !== 'COP') {
        void exchangeRateService.ensureFreshRate();
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
