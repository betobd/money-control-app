/**
 * Public barrel for exchange rates. Import from here rather than reaching into
 * modules.
 */
import type { CurrencyCode } from '@/features/currency/currency';
import { getBaseCurrency } from '@/features/settings/base-currency';
import { ExchangeRateService } from './exchange-rate.service';
import { FrankfurterExchangeRateProvider } from './frankfurter.provider';
import { SQLiteExchangeRateRepository } from './sqlite-exchange-rate.repository';
import type { ExchangeRateRecord } from './exchange-rate.types';
import { ValuationRates } from './valuation-rates';

const repository = new SQLiteExchangeRateRepository();

export const exchangeRateService = new ExchangeRateService(
  repository,
  new FrankfurterExchangeRateProvider(),
);

/**
 * Every saved rate, keyed by the currency it values against the base.
 *
 * Loads all rates rather than a requested subset: callers such as the portfolio
 * and net worth need rates *before* they know which currencies they hold, and a
 * user holds a handful of currencies at most, so there is nothing to save by
 * asking twice.
 */
export async function loadValuationRates(): Promise<ValuationRates> {
  const base = getBaseCurrency();
  const records = new Map<CurrencyCode, ExchangeRateRecord>();
  for (const record of await repository.list()) {
    // A rate is usable here only if one side is the current base currency. A
    // leftover pair from a base currency the user has since changed away from
    // (possible only while the install had no history) is silently ignored.
    if (record.quoteCurrencyCode === base) records.set(record.baseCurrencyCode, record);
    else if (record.baseCurrencyCode === base) records.set(record.quoteCurrencyCode, record);
  }
  return new ValuationRates(base, records);
}

export * from './exchange-rate.types';
export * from './valuation-rates';
export {
  ExchangeRateServiceError,
  isExchangeRateServiceError,
  RATE_FRESHNESS_MS,
  type ExchangeRateServiceErrorCode,
} from './exchange-rate.service';
export { isExchangeRateProviderError } from './frankfurter.provider';
