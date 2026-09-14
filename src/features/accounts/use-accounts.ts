import { useCallback, useState } from 'react';

import { accountService } from './accounts';
import type { AccountWithBalance } from './account.types';
import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';
import { exchangeRateService, loadValuationRates } from '@/features/exchange-rates/exchange-rates';
import type { ExchangeRateStatus } from '@/features/exchange-rates/exchange-rate.types';
import { ValuationRates } from '@/features/exchange-rates/valuation-rates';
import { getBaseCurrency } from '@/features/settings/settings';
import { getMessages } from '@/i18n/messages';

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [rates, setRates] = useState<ValuationRates>(() => new ValuationRates(getBaseCurrency(), new Map()));
  const [rateStatuses, setRateStatuses] = useState<ExchangeRateStatus[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const loadedAccounts = await accountService.list(true);
      const currencies = loadedAccounts.map((account) => account.currency);
      const [loadedRates, statuses] = await Promise.all([
        loadValuationRates(),
        exchangeRateService.listStatuses(currencies),
      ]);
      setAccounts(loadedAccounts);
      setRates(loadedRates);
      setRateStatuses(statuses);
      // Controlled, non-blocking startup refresh on first access to currency data:
      // only refreshes what is stale/missing, de-duplicated and rate-limited by the
      // service, and only for the currencies actually held.
      if (statuses.length > 0) {
        void exchangeRateService.ensureFreshRates(currencies);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : getMessages().accounts.errors.loadAccounts);
    } finally {
      setLoading(false);
    }
  }, []);

  useFinancialDataRefresh(load);

  return { accounts, rates, rateStatuses, error, loading, reload: load };
}
