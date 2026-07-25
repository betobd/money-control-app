import { useCallback, useState } from 'react';

import { toUserMessage } from '@/errors/user-error';
import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';
import { exchangeRateService } from './exchange-rates';
import { ExchangeRateServiceError } from './exchange-rate.service';
import type { ExchangeRateStatus } from './exchange-rate.types';

export type UseExchangeRateResult = {
  status: ExchangeRateStatus | null;
  loading: boolean;
  busy: boolean;
  error: string | undefined;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
  setManualRate: (input: string) => Promise<void>;
};

/**
 * Reads and mutates the USD/COP valuation rate for the settings screen. It never
 * auto-fetches from the network on mount (that is the controlled startup refresh);
 * it reads the cached status and exposes explicit refresh / manual-entry actions.
 */
export function useExchangeRate(): UseExchangeRateResult {
  const [status, setStatus] = useState<ExchangeRateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setStatus(await exchangeRateService.getStatus());
    } catch (cause) {
      setError(toUserMessage(cause, 'Unable to load the exchange rate.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFinancialDataRefresh(load);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(undefined);
    try {
      setStatus(await exchangeRateService.refreshFromProvider());
    } catch (cause) {
      if (cause instanceof ExchangeRateServiceError) {
        setError(cause.message);
        setStatus(await exchangeRateService.getStatus());
      } else {
        setError(toUserMessage(cause, 'Could not update the exchange rate.'));
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const setManualRate = useCallback(async (input: string) => {
    setBusy(true);
    setError(undefined);
    try {
      setStatus(await exchangeRateService.setManualRate(input));
    } catch (cause) {
      if (cause instanceof ExchangeRateServiceError) {
        setError(cause.message);
      } else {
        setError(toUserMessage(cause, 'Could not save the exchange rate.'));
      }
      throw cause;
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, loading, busy, error, reload: load, refresh, setManualRate };
}
