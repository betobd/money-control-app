import type { CurrencyCode } from '@/features/currency/currency';
import type { ExchangeRateRecord } from './exchange-rate.types';

/** Persistence for stored valuation rates, one row per ordered pair. No network. */
export interface ExchangeRateRepository {
  /** The stored rate for this pair in either orientation, or null. */
  find(base: CurrencyCode, quote: CurrencyCode): Promise<ExchangeRateRecord | null>;
  /** Every stored rate, for the rates screen and for bulk valuation. */
  list(): Promise<ExchangeRateRecord[]>;
  save(record: ExchangeRateRecord): Promise<void>;
}
