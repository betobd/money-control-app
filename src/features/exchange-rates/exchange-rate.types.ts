import type { CurrencyCode } from '@/features/currency/currency';

/** Source of a stored valuation rate. */
export type ExchangeRateSource = 'frankfurter' | 'manual';

/** The persisted latest valid USD/COP valuation rate (one row per pair). */
export type ExchangeRateRecord = {
  id: string; // 'USD-COP'
  baseCurrencyCode: CurrencyCode; // 'USD'
  quoteCurrencyCode: CurrencyCode; // 'COP'
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
  rate: ExchangeRateRecord | null;
  freshness: ExchangeRateFreshness;
};

/** Identifier for the single supported valuation pair in v1. */
export const USD_COP_RATE_ID = 'USD-COP';
