/**
 * Builders for {@link ValuationRates} in tests.
 *
 * Tests used to pass `null` for "no rate" and a bare `{rateScaled, rateScale}`
 * for "this rate". Both are now a lookup object, so these two helpers keep the
 * intent readable at the call site.
 */
import { ValuationRates } from '../../src/features/exchange-rates/valuation-rates.ts';

/** No saved rates: every foreign currency is unconvertible. */
export function noRates(base = 'COP') {
  return new ValuationRates(base, new Map());
}

/**
 * Rates for the given currencies, each stated as "1 currency = rateScaled/rateScale base".
 * `ratesFor('COP', { USD: [41_000_000, 10_000] })` is 1 USD = 4,100 COP.
 */
export function ratesFor(base, entries) {
  const records = new Map();
  for (const [currency, [rateScaled, rateScale]] of Object.entries(entries)) {
    records.set(currency, {
      id: `${currency}-${base}`,
      baseCurrencyCode: currency,
      quoteCurrencyCode: base,
      rateScaled,
      rateScale,
      effectiveDate: '2026-08-01',
      fetchedAt: '2026-08-01T12:00:00.000Z',
      provider: 'frankfurter',
      source: 'frankfurter',
      createdAt: '2026-08-01T12:00:00.000Z',
      updatedAt: '2026-08-01T12:00:00.000Z',
    });
  }
  return new ValuationRates(base, records);
}

/** The USD/COP rate the pre-existing suites were written against. */
export function usdCopRates(rateScaled = 41_000_000, rateScale = 10_000) {
  return ratesFor('COP', { USD: [rateScaled, rateScale] });
}
