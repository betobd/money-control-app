import { eq, inArray } from 'drizzle-orm';

import { database } from '@/database/client';
import { exchangeRates } from '@/database/schema';
import { isSupportedCurrency, type CurrencyCode } from '@/features/currency/currency';
import type { ExchangeRateRepository } from './exchange-rate.repository';
import { rateId, type ExchangeRateRecord, type ExchangeRateSource } from './exchange-rate.types';

type ExchangeRateRow = typeof exchangeRates.$inferSelect;

function mapRow(row: ExchangeRateRow): ExchangeRateRecord | null {
  // The currency columns are shape-checked, not enumerated, so a code the registry
  // no longer knows can reach here after a downgrade. Dropping the row is right:
  // an unusable rate should read as "no rate", which the app already handles, not
  // as a crash on a screen that merely lists rates.
  if (!isSupportedCurrency(row.baseCurrencyCode) || !isSupportedCurrency(row.quoteCurrencyCode)) {
    return null;
  }
  return {
    id: row.id,
    baseCurrencyCode: row.baseCurrencyCode,
    quoteCurrencyCode: row.quoteCurrencyCode,
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
  async find(base: CurrencyCode, quote: CurrencyCode): Promise<ExchangeRateRecord | null> {
    // Either orientation answers the question: a stored USD/COP rate converts COP
    // to USD just as well. Looking up only one would refetch a rate already held.
    // The requested orientation wins when both exist, so the answer does not depend
    // on row order.
    const preferred = rateId(base, quote);
    const rows = await database.query.exchangeRates.findMany({
      where: inArray(exchangeRates.id, [preferred, rateId(quote, base)]),
    });
    const ordered = [...rows].sort((a, b) => Number(b.id === preferred) - Number(a.id === preferred));
    for (const row of ordered) {
      const mapped = mapRow(row);
      if (mapped) return mapped;
    }
    return null;
  }

  async list(): Promise<ExchangeRateRecord[]> {
    const rows = await database.query.exchangeRates.findMany();
    return rows.map(mapRow).filter((record): record is ExchangeRateRecord => record !== null);
  }

  async save(record: ExchangeRateRecord): Promise<void> {
    // Drop the same pair stored the other way round, so a pair never ends up with
    // two rows that can disagree after one of them is refreshed.
    await database
      .delete(exchangeRates)
      .where(eq(exchangeRates.id, rateId(record.quoteCurrencyCode, record.baseCurrencyCode)));
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
