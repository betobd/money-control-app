import { useCallback, useState } from 'react';

import { accountService } from './accounts';
import type { AccountWithBalance } from './account.types';
import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';
import { exchangeRateService } from '@/features/exchange-rates/exchange-rates';
import type { ExchangeRateStatus } from '@/features/exchange-rates/exchange-rate.types';

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [rateStatus, setRateStatus] = useState<ExchangeRateStatus | null>(null);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [loadedAccounts, status] = await Promise.all([
        accountService.list(true),
        exchangeRateService.getStatus(),
      ]);
      setAccounts(loadedAccounts);
      setRateStatus(status);
      // Controlled, non-blocking startup refresh on first access to currency data:
      // only refreshes when stale/missing, de-duplicated and rate-limited by the service.
      if (loadedAccounts.some((account) => account.currency !== 'COP')) {
        void exchangeRateService.ensureFreshRate();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFinancialDataRefresh(load);

  return { accounts, rateStatus, error, loading, reload: load };
}
