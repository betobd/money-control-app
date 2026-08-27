/**
 * Exchange-rate freshness, caching, manual entry, and controlled remote refresh.
 *
 * Policy (docs/decisions/0008-configurable-base-currency.md):
 * - One rate per foreign currency, always against the device's base currency.
 * - A stored rate is fresh for 24 hours from its fetch time.
 * - A stale/missing rate triggers at most one refresh per currency; concurrent
 *   refreshes are de-duplicated and a failed refresh sets a short per-currency
 *   cool-down to avoid storms.
 * - A failed refresh keeps the last valid rate (never deletes it) and reports it
 *   as stale. Manual entry is always available.
 * - No network access lives here; that is the provider's job.
 */
import {
  parseExchangeRate,
  type CurrencyCode,
  type DirectedRate,
} from '@/features/currency/currency';
import { getBaseCurrency } from '@/features/settings/base-currency';
import { bogotaToday } from '@/features/transactions/transaction-date';
import { notifyFinancialDataChanged } from '@/features/transactions/financial-data-events';
import { isExchangeRateProviderError, type ExchangeRateProvider } from './frankfurter.provider';
import type { ExchangeRateRepository } from './exchange-rate.repository';
import {
  rateId,
  toDirectedRate,
  type ExchangeRateFreshness,
  type ExchangeRateRecord,
  type ExchangeRateStatus,
} from './exchange-rate.types';

export const RATE_FRESHNESS_MS = 24 * 60 * 60 * 1000;
export const REFRESH_FAILURE_COOLDOWN_MS = 5 * 60 * 1000;

export type ExchangeRateServiceErrorCode =
  | 'invalid_manual_rate'
  | 'refresh_failed'
  | 'no_rate_available';

export class ExchangeRateServiceError extends Error {
  readonly isExchangeRateServiceError = true;

  constructor(
    public readonly code: ExchangeRateServiceErrorCode,
    message: string,
    public readonly cachedRate: ExchangeRateRecord | null = null,
  ) {
    super(message);
  }
}

export function isExchangeRateServiceError(value: unknown): value is ExchangeRateServiceError {
  return value instanceof Error && (value as ExchangeRateServiceError).isExchangeRateServiceError === true;
}

type ExchangeRateServiceOptions = {
  now?: () => string;
  today?: () => string;
  baseCurrency?: () => CurrencyCode;
};

export class ExchangeRateService {
  private readonly now: () => string;
  private readonly today: () => string;
  private readonly baseCurrency: () => CurrencyCode;
  private readonly refreshInFlight = new Map<CurrencyCode, Promise<ExchangeRateStatus>>();
  private readonly lastFailureAtMs = new Map<CurrencyCode, number>();

  constructor(
    private readonly repository: ExchangeRateRepository,
    private readonly provider: ExchangeRateProvider,
    options: ExchangeRateServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.today = options.today ?? (() => bogotaToday());
    this.baseCurrency = options.baseCurrency ?? getBaseCurrency;
  }

  private nowMs(): number {
    return Date.parse(this.now());
  }

  freshnessOf(rate: ExchangeRateRecord | null): ExchangeRateFreshness {
    if (!rate) return 'none';
    const age = this.nowMs() - Date.parse(rate.fetchedAt);
    return age <= RATE_FRESHNESS_MS ? 'fresh' : 'stale';
  }

  async getStatusFor(currency: CurrencyCode): Promise<ExchangeRateStatus> {
    const base = this.baseCurrency();
    if (currency === base) {
      // The base currency needs no rate, and reporting it as missing would put a
      // permanent "no rate available" warning on a perfectly complete total.
      return { currencyCode: currency, rate: null, freshness: 'fresh' };
    }
    const rate = await this.repository.find(currency, base);
    return { currencyCode: currency, rate, freshness: this.freshnessOf(rate) };
  }

  async listStatuses(currencies: readonly CurrencyCode[]): Promise<ExchangeRateStatus[]> {
    const base = this.baseCurrency();
    const foreign = [...new Set(currencies)].filter((code) => code !== base);
    return Promise.all(foreign.map((code) => this.getStatusFor(code)));
  }

  /** The rate that converts `currency` to the base currency, or null. */
  async getRateFor(currency: CurrencyCode): Promise<DirectedRate | null> {
    const { rate } = await this.getStatusFor(currency);
    return rate ? toDirectedRate(rate) : null;
  }

  /**
   * Rates for several currencies at once, keyed by currency. Currencies with no
   * stored rate are absent rather than null, so callers must decide explicitly
   * what an unconvertible amount means instead of defaulting it to zero.
   */
  async getRatesFor(currencies: readonly CurrencyCode[]): Promise<Map<CurrencyCode, DirectedRate>> {
    const statuses = await this.listStatuses(currencies);
    const rates = new Map<CurrencyCode, DirectedRate>();
    for (const status of statuses) {
      if (status.rate) rates.set(status.currencyCode, toDirectedRate(status.rate));
    }
    return rates;
  }

  /**
   * Non-blocking auto-refresh for the currencies actually in use. Refreshes only
   * what is stale or missing, never throws, and respects the per-currency failure
   * cool-down and in-flight de-duplication.
   */
  async ensureFreshRates(currencies: readonly CurrencyCode[]): Promise<void> {
    const base = this.baseCurrency();
    const stale: CurrencyCode[] = [];
    for (const currency of new Set(currencies)) {
      if (currency === base) continue;
      const status = await this.getStatusFor(currency);
      if (status.freshness === 'fresh') continue;
      if (this.refreshInFlight.has(currency)) continue;
      const failedAt = this.lastFailureAtMs.get(currency);
      if (failedAt !== undefined && this.nowMs() - failedAt < REFRESH_FAILURE_COOLDOWN_MS) continue;
      stale.push(currency);
    }
    // Settled, not all: one unreachable currency must not discard the rates that
    // did arrive.
    await Promise.allSettled(stale.map((currency) => this.refreshFromProvider(currency)));
  }

  /** Refresh one currency from the provider. De-duplicates concurrent calls. */
  refreshFromProvider(currency: CurrencyCode): Promise<ExchangeRateStatus> {
    const existing = this.refreshInFlight.get(currency);
    if (existing) return existing;
    const refresh = this.performRefresh(currency).finally(() => {
      this.refreshInFlight.delete(currency);
    });
    this.refreshInFlight.set(currency, refresh);
    return refresh;
  }

  private async performRefresh(currency: CurrencyCode): Promise<ExchangeRateStatus> {
    const base = this.baseCurrency();
    if (currency === base) {
      throw new ExchangeRateServiceError(
        'invalid_manual_rate',
        'The base currency has no exchange rate against itself.',
      );
    }
    try {
      const fetched = await this.provider.fetchRate(currency, base);
      const existing = await this.repository.find(currency, base);
      const timestamp = this.now();
      const record: ExchangeRateRecord = {
        id: rateId(fetched.baseCurrencyCode, fetched.quoteCurrencyCode),
        baseCurrencyCode: fetched.baseCurrencyCode,
        quoteCurrencyCode: fetched.quoteCurrencyCode,
        rateScaled: fetched.rateScaled,
        rateScale: fetched.rateScale,
        effectiveDate: fetched.effectiveDate,
        fetchedAt: timestamp,
        provider: fetched.provider,
        source: 'frankfurter',
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };
      await this.repository.save(record);
      this.lastFailureAtMs.delete(currency);
      notifyFinancialDataChanged({ kind: 'exchange-rate', operation: 'update' });
      return { currencyCode: currency, rate: record, freshness: this.freshnessOf(record) };
    } catch (cause) {
      this.lastFailureAtMs.set(currency, this.nowMs());
      const cached = await this.repository.find(currency, base);
      if (isExchangeRateProviderError(cause)) {
        throw new ExchangeRateServiceError(
          cached ? 'refresh_failed' : 'no_rate_available',
          cached
            ? `Could not update the ${currency}/${base} reference rate. The last saved rate is still being used.`
            : `No exchange rate is available for ${currency}. Enter a ${currency}/${base} rate manually.`,
          cached,
        );
      }
      throw cause;
    }
  }

  /** Validate and persist a manual rate, read as "1 currency = input base". */
  async setManualRate(currency: CurrencyCode, input: string): Promise<ExchangeRateStatus> {
    const base = this.baseCurrency();
    if (currency === base) {
      throw new ExchangeRateServiceError(
        'invalid_manual_rate',
        'The base currency has no exchange rate against itself.',
      );
    }
    const parsed = parseExchangeRate(input);
    if (!parsed.ok) {
      throw new ExchangeRateServiceError(
        'invalid_manual_rate',
        `Enter a valid ${currency}/${base} rate greater than zero.`,
      );
    }
    const existing = await this.repository.find(currency, base);
    const timestamp = this.now();
    const record: ExchangeRateRecord = {
      id: rateId(currency, base),
      baseCurrencyCode: currency,
      quoteCurrencyCode: base,
      rateScaled: parsed.rateScaled,
      rateScale: parsed.rateScale,
      effectiveDate: this.today(),
      fetchedAt: timestamp,
      provider: null,
      source: 'manual',
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    await this.repository.save(record);
    notifyFinancialDataChanged({ kind: 'exchange-rate', operation: 'update' });
    return { currencyCode: currency, rate: record, freshness: this.freshnessOf(record) };
  }
}
