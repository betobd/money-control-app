import type { ExchangeRateRecord } from './exchange-rate.types';

/** Persistence for the latest valid valuation rate. No network access. */
export interface ExchangeRateRepository {
  getValuationRate(): Promise<ExchangeRateRecord | null>;
  saveValuationRate(record: ExchangeRateRecord): Promise<void>;
}
