import type { CurrencyCode, DirectedRate } from '@/features/currency/currency';

/** Source of a stored valuation rate. */
export type ExchangeRateSource = 'frankfurter' | 'manual';

/**
 * A stored valuation rate for one ordered currency pair, read as
 * "1 base = rate quote". Rates are stored with the *foreign* currency as the base
 * and the device's base currency as the quote (e.g. `USD-COP`), which is the
 * orientation a user recognises: "one dollar is 4,102 pesos".
 */
export type ExchangeRateRecord = {
  id: string; // `${base}-${quote}`, e.g. 'USD-COP'
  baseCurrencyCode: CurrencyCode;
  quoteCurrencyCode: CurrencyCode;
  rateScaled: number;
  rateScale: number;
  effectiveDate: string; // YYYY-MM-DD
  fetchedAt: string; // UTC ISO 8601
  provider: string | null;
  source: ExchangeRateSource;
  createdAt: string;
  updatedAt: string;
};

/** A rate fetched from a provider, already converted to a scaled integer. */
export type FetchedExchangeRate = {
  baseCurrencyCode: CurrencyCode;
  quoteCurrencyCode: CurrencyCode;
  rateScaled: number;
  rateScale: number;
  effectiveDate: string;
  provider: string;
};

export type ExchangeRateFreshness = 'fresh' | 'stale' | 'none';

export type ExchangeRateStatus = {
  currencyCode: CurrencyCode;
  rate: ExchangeRateRecord | null;
  freshness: ExchangeRateFreshness;
};

/** Stable row id for an ordered pair. */
export function rateId(base: CurrencyCode, quote: CurrencyCode): string {
  return `${base}-${quote}`;
}

/** The stored record as a rate the conversion functions can apply. */
export function toDirectedRate(record: ExchangeRateRecord): DirectedRate {
  return {
    baseCurrencyCode: record.baseCurrencyCode,
    quoteCurrencyCode: record.quoteCurrencyCode,
    rateScaled: record.rateScaled,
    rateScale: record.rateScale,
  };
}
