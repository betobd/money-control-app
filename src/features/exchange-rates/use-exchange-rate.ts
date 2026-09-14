import { useCallback, useState } from 'react';

import { toUserMessage } from '@/errors/user-error';
import { accountService } from '@/features/accounts/accounts';
import type { CurrencyCode } from '@/features/currency/currency';
import { settingsService, type BaseCurrencyLock } from '@/features/settings/settings';
import { getBaseCurrency } from '@/features/settings/settings';
import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';
import { getMessages } from '@/i18n/messages';
import { exchangeRateService } from './exchange-rates';
import { isExchangeRateServiceError } from './exchange-rate.service';
import type { ExchangeRateStatus } from './exchange-rate.types';

export type UseExchangeRatesResult = {
  baseCurrency: CurrencyCode;
  /** Whether the base currency can still be changed, and if not, why. */
  baseCurrencyLock: BaseCurrencyLock;
  /** One entry per foreign currency the user actually holds. */
  statuses: ExchangeRateStatus[];
  loading: boolean;
  /** The currency currently being refreshed or saved, if any. */
  busyCurrency: CurrencyCode | null;
  error: string | undefined;
  reload: () => Promise<void>;
  refresh: (currency: CurrencyCode) => Promise<void>;
  setManualRate: (currency: CurrencyCode, input: string) => Promise<void>;
};

/**
 * Reads and mutates the saved valuation rates for the settings screen.
 *
 * The list is driven by the currencies the user holds, not by every currency the
 * app supports: a rates screen listing 160 rows, 159 of which are irrelevant,
 * would bury the one that is stale. It never auto-fetches on mount (that is the
 * controlled startup refresh); it reads cached status and exposes explicit
 * refresh / manual-entry actions per currency.
 */
export function useExchangeRates(): UseExchangeRatesResult {
  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>(getBaseCurrency);
  const [statuses, setStatuses] = useState<ExchangeRateStatus[]>([]);
  // Loaded alongside the rates rather than in its own effect: it is read from the
  // same database at the same moment, and a second effect would render the
  // "change base currency" button enabled for one frame before locking it.
  const [baseCurrencyLock, setBaseCurrencyLock] = useState<BaseCurrencyLock>(
    { reason: 'history', transactionCount: 0, budgetCount: 0 },
  );
  const [loading, setLoading] = useState(true);
  const [busyCurrency, setBusyCurrency] = useState<CurrencyCode | null>(null);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [accounts, lock] = await Promise.all([
        accountService.list(true),
        settingsService.baseCurrencyLock(),
      ]);
      setBaseCurrency(getBaseCurrency());
      setBaseCurrencyLock(lock);
      setStatuses(await exchangeRateService.listStatuses(accounts.map((account) => account.currency)));
    } catch (cause) {
      setError(toUserMessage(cause, getMessages().exchangeRates.loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFinancialDataRefresh(load);

  const replace = useCallback((next: ExchangeRateStatus) => {
    setStatuses((current) => current.map((status) =>
      status.currencyCode === next.currencyCode ? next : status));
  }, []);

  const refresh = useCallback(async (currency: CurrencyCode) => {
    setBusyCurrency(currency);
    setError(undefined);
    try {
      replace(await exchangeRateService.refreshFromProvider(currency));
    } catch (cause) {
      if (isExchangeRateServiceError(cause)) {
        setError(cause.message);
        // A failed refresh keeps the cached rate; re-read so the row shows it as
        // stale rather than disappearing.
        replace(await exchangeRateService.getStatusFor(currency));
      } else {
        setError(toUserMessage(cause, getMessages().exchangeRates.refreshError));
      }
    } finally {
      setBusyCurrency(null);
    }
  }, [replace]);

  const setManualRate = useCallback(async (currency: CurrencyCode, input: string) => {
    setBusyCurrency(currency);
    setError(undefined);
    try {
      replace(await exchangeRateService.setManualRate(currency, input));
    } catch (cause) {
      setError(isExchangeRateServiceError(cause)
        ? cause.message
        : toUserMessage(cause, getMessages().exchangeRates.saveError));
      throw cause;
    } finally {
      setBusyCurrency(null);
    }
  }, [replace]);

  return { baseCurrency, baseCurrencyLock, statuses, loading, busyCurrency, error, reload: load, refresh, setManualRate };
}
