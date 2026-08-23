/**
 * Exchange-rate freshness, caching, manual entry, and controlled remote refresh.
 *
 * Policy (docs/decisions/0005-multi-currency-cop-usd.md):
 * - A stored rate is fresh for 24 hours from its fetch time.
 * - A stale/missing rate triggers at most one refresh; concurrent refreshes are
 *   de-duplicated and a failed refresh sets a short cool-down to avoid storms.
 * - A failed refresh keeps the last valid rate (never deletes it) and reports it
 *   as stale. Manual entry is always available.
 * - No network access lives here; that is the provider's job.
 */
import {
  parseExchangeRate,
  type CurrencyCode,
} from '@/features/currency/currency';
import { bogotaToday } from '@/features/transactions/transaction-date';
import { notifyFinancialDataChanged } from '@/features/transactions/financial-data-events';
import { isExchangeRateProviderError, type ExchangeRateProvider } from './frankfurter.provider';
import type { ExchangeRateRepository } from './exchange-rate.repository';
import {
  USD_COP_RATE_ID,
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
  constructor(
    public readonly code: ExchangeRateServiceErrorCode,
    message: string,
    public readonly cachedRate: ExchangeRateRecord | null = null,
  ) {
    super(message);
  }
}

type ExchangeRateServiceOptions = {
  now?: () => string;
  today?: () => string;
  createId?: () => string;
};

export class ExchangeRateService {
  private readonly now: () => string;
  private readonly today: () => string;
  private refreshInFlight: Promise<ExchangeRateStatus> | undefined;
  private lastFailureAtMs: number | undefined;

  constructor(
    private readonly repository: ExchangeRateRepository,
    private readonly provider: ExchangeRateProvider,
    options: ExchangeRateServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.today = options.today ?? (() => bogotaToday());
  }

  private nowMs(): number {
    return Date.parse(this.now());
  }

  freshnessOf(rate: ExchangeRateRecord | null): ExchangeRateFreshness {
    if (!rate) return 'none';
    const age = this.nowMs() - Date.parse(rate.fetchedAt);
    return age <= RATE_FRESHNESS_MS ? 'fresh' : 'stale';
  }

  async getStatus(): Promise<ExchangeRateStatus> {
    const rate = await this.repository.getValuationRate();
    return { rate, freshness: this.freshnessOf(rate) };
  }

  /** The current valuation rate for converting USD balances to COP, or null. */
  async getValuationRate(): Promise<ExchangeRateRecord | null> {
    return this.repository.getValuationRate();
  }

  /**
   * Non-blocking auto-refresh used on startup / first access to currency-dependent
   * data. Refreshes only when stale/missing, never throws, and respects the
   * failure cool-down and in-flight de-duplication.
   */
  async ensureFreshRate(): Promise<void> {
    const status = await this.getStatus();
    if (status.freshness === 'fresh') return;
    if (this.refreshInFlight) return;
    if (
      this.lastFailureAtMs !== undefined &&
      this.nowMs() - this.lastFailureAtMs < REFRESH_FAILURE_COOLDOWN_MS
    ) {
      return;
    }
    try {
      await this.refreshFromProvider();
    } catch {
      // Keep the cached rate; auto-refresh never surfaces an error.
    }
  }

  /** Refresh from the provider. De-duplicates concurrent calls. Throws on failure. */
  refreshFromProvider(): Promise<ExchangeRateStatus> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.performRefresh().finally(() => {
      this.refreshInFlight = undefined;
    });
    return this.refreshInFlight;
  }

  private async performRefresh(): Promise<ExchangeRateStatus> {
    try {
      const fetched = await this.provider.fetchUsdCopRate();
      const existing = await this.repository.getValuationRate();
      const timestamp = this.now();
      const record: ExchangeRateRecord = {
        id: USD_COP_RATE_ID,
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
      await this.repository.saveValuationRate(record);
      this.lastFailureAtMs = undefined;
      notifyFinancialDataChanged({ kind: 'exchange-rate', operation: 'update' });
      return { rate: record, freshness: this.freshnessOf(record) };
    } catch (cause) {
      this.lastFailureAtMs = this.nowMs();
      const cached = await this.repository.getValuationRate();
      if (isExchangeRateProviderError(cause)) {
        throw new ExchangeRateServiceError(
          cached ? 'refresh_failed' : 'no_rate_available',
          cached
            ? 'Could not update the USD/COP reference rate. The last saved rate is still being used.'
            : 'No exchange rate is available. Enter a USD/COP rate manually.',
          cached,
        );
      }
      throw cause;
    }
  }

  /** Validate and persist a manual USD/COP rate. Becomes the current valuation rate. */
  async setManualRate(input: string): Promise<ExchangeRateStatus> {
    const parsed = parseExchangeRate(input);
    if (!parsed.ok) {
      throw new ExchangeRateServiceError(
        'invalid_manual_rate',
        'Enter a valid USD/COP rate greater than zero.',
      );
    }
    const existing = await this.repository.getValuationRate();
    const timestamp = this.now();
    const base: CurrencyCode = 'USD';
    const quote: CurrencyCode = 'COP';
    const record: ExchangeRateRecord = {
      id: USD_COP_RATE_ID,
      baseCurrencyCode: base,
      quoteCurrencyCode: quote,
      rateScaled: parsed.rateScaled,
      rateScale: parsed.rateScale,
      effectiveDate: this.today(),
      fetchedAt: timestamp,
      provider: null,
      source: 'manual',
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    await this.repository.saveValuationRate(record);
    notifyFinancialDataChanged({ kind: 'exchange-rate', operation: 'update' });
    return { rate: record, freshness: this.freshnessOf(record) };
  }
}
