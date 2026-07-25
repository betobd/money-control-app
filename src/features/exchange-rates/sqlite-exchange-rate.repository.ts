import { eq } from 'drizzle-orm';

import { database } from '@/database/client';
import { exchangeRates } from '@/database/schema';
import type { CurrencyCode } from '@/features/currency/currency';
import type { ExchangeRateRepository } from './exchange-rate.repository';
import { USD_COP_RATE_ID, type ExchangeRateRecord, type ExchangeRateSource } from './exchange-rate.types';

type ExchangeRateRow = typeof exchangeRates.$inferSelect;

function mapRow(row: ExchangeRateRow): ExchangeRateRecord {
  return {
    id: row.id,
    baseCurrencyCode: row.baseCurrencyCode as CurrencyCode,
    quoteCurrencyCode: row.quoteCurrencyCode as CurrencyCode,
    rateScaled: row.rateScaled,
    rateScale: row.rateScale,
    effectiveDate: row.effectiveDate,
    fetchedAt: row.fetchedAt,
    provider: row.provider,
    source: row.source as ExchangeRateSource,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class SQLiteExchangeRateRepository implements ExchangeRateRepository {
  async getValuationRate(): Promise<ExchangeRateRecord | null> {
    const row = await database.query.exchangeRates.findFirst({
      where: eq(exchangeRates.id, USD_COP_RATE_ID),
    });
    return row ? mapRow(row) : null;
  }

  async saveValuationRate(record: ExchangeRateRecord): Promise<void> {
    await database
      .insert(exchangeRates)
      .values(record)
      .onConflictDoUpdate({
        target: exchangeRates.id,
        set: {
          baseCurrencyCode: record.baseCurrencyCode,
          quoteCurrencyCode: record.quoteCurrencyCode,
          rateScaled: record.rateScaled,
          rateScale: record.rateScale,
          effectiveDate: record.effectiveDate,
          fetchedAt: record.fetchedAt,
          provider: record.provider,
          source: record.source,
          updatedAt: record.updatedAt,
        },
      });
  }
}
