/**
 * A resolved set of valuation rates, for code that has to value many currencies
 * at once: net worth, reports, the investment portfolio, CSV export.
 *
 * Every one of those used to take a single USD/COP rate, because there was only
 * one pair. The replacement is deliberately a lookup that can answer "no", not a
 * rate that defaults to 1: an amount in a currency with no rate is *unknown*, and
 * quietly treating it as if it were already in the base currency would overstate
 * or understate a total with no visible sign that anything was missing. Callers
 * get `null` and must decide, which is what the existing
 * "Estimated — incomplete" state is for.
 */
import {
  toBaseCurrencyMinor,
  type CurrencyCode,
  type DirectedRate,
} from '@/features/currency/currency';
import { toDirectedRate, type ExchangeRateRecord, type ExchangeRateSource } from './exchange-rate.types';

/** The rate plus the provenance a stored snapshot needs. */
export type ValuationRateSnapshot = {
  rate: DirectedRate;
  effectiveDate: string;
  source: ExchangeRateSource;
};

export class ValuationRates {
  constructor(
    readonly baseCurrency: CurrencyCode,
    private readonly records: ReadonlyMap<CurrencyCode, ExchangeRateRecord>,
  ) {}

  /** Whether an amount in this currency can be valued in the base currency. */
  has(code: CurrencyCode): boolean {
    return code === this.baseCurrency || this.records.has(code);
  }

  rateFor(code: CurrencyCode): DirectedRate | null {
    if (code === this.baseCurrency) return null;
    const record = this.records.get(code);
    return record ? toDirectedRate(record) : null;
  }

  snapshotFor(code: CurrencyCode): ValuationRateSnapshot | null {
    if (code === this.baseCurrency) return null;
    const record = this.records.get(code);
    if (!record) return null;
    return { rate: toDirectedRate(record), effectiveDate: record.effectiveDate, source: record.source };
  }

  /**
   * The saved rate flattened into the shape a transaction stores. Screens used to
   * assemble this by hand from a rate record, which is how the pair kept getting
   * dropped; there is one construction now.
   */
  snapshotInputFor(code: CurrencyCode): {
    rateScaled: number;
    rateScale: number;
    baseCurrencyCode: CurrencyCode;
    quoteCurrencyCode: CurrencyCode;
    effectiveDate: string;
    source: ExchangeRateSource;
  } | null {
    const snapshot = this.snapshotFor(code);
    if (!snapshot) return null;
    return {
      rateScaled: snapshot.rate.rateScaled,
      rateScale: snapshot.rate.rateScale,
      baseCurrencyCode: snapshot.rate.baseCurrencyCode,
      quoteCurrencyCode: snapshot.rate.quoteCurrencyCode,
      effectiveDate: snapshot.effectiveDate,
      source: snapshot.source,
    };
  }

  /** Value an amount in the base currency, or null when no rate is available. */
  toBase(minor: number, code: CurrencyCode): number | null {
    if (code === this.baseCurrency) return minor;
    const rate = this.rateFor(code);
    if (!rate) return null;
    return toBaseCurrencyMinor(minor, code, this.baseCurrency, rate);
  }

  /**
   * Sum amounts across currencies, or null if any of them cannot be valued.
   * All-or-nothing on purpose: a total silently missing one account is worse than
   * no total, because nothing on screen distinguishes the two.
   */
  sumToBase(amounts: readonly { minor: number; currency: CurrencyCode }[]): number | null {
    let total = 0;
    for (const { minor, currency } of amounts) {
      const valued = this.toBase(minor, currency);
      if (valued === null) return null;
      total += valued;
    }
    return total;
  }

  /** Currencies that were asked for but have no rate. Drives the warning copy. */
  missing(codes: readonly CurrencyCode[]): CurrencyCode[] {
    return [...new Set(codes)].filter((code) => !this.has(code));
  }
}

/** Loads the rates for a set of currencies. Injected so services stay testable. */
export type ValuationRatesLoader = (currencies: readonly CurrencyCode[]) => Promise<ValuationRates>;
