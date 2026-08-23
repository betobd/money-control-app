/**
 * Fetches the USD/COP reference rate from Frankfurter and maps it to the internal
 * scaled-integer model. Network-only: no SQLite access, no React state. Sends only
 * the currency pair — never any account, transaction, or user data. The raw
 * response number is never persisted; it is converted immediately to a scaled
 * integer. Frankfurter provides a reference rate, not a live/guaranteed bank rate.
 */
import { DEFAULT_RATE_SCALE } from '@/features/currency/currency';
import { isValidCalendarDate } from '@/features/transactions/transaction-date';
import type { FetchedExchangeRate } from './exchange-rate.types';

export const FRANKFURTER_BASE_URL = 'https://api.frankfurter.dev';
export const EXCHANGE_RATE_TIMEOUT_MS = 10_000;

export type ExchangeRateProviderErrorCode =
  | 'network'
  | 'timeout'
  | 'http'
  | 'invalid_response'
  | 'unsupported_rate';

export class ExchangeRateProviderError extends Error {
  /**
   * Stable brand. Cross-module `instanceof` compares constructor identity, which
   * only holds while every importer shares one module instance. Code outside
   * this module must use the exported type guard.
   */
  readonly isExchangeRateProviderError = true;

  constructor(
    public readonly code: ExchangeRateProviderErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** Identity-independent check for {@link ExchangeRateProviderError}. */
export function isExchangeRateProviderError(value: unknown): value is ExchangeRateProviderError {
  return value instanceof Error && (value as ExchangeRateProviderError).isExchangeRateProviderError === true;
}

export interface ExchangeRateProvider {
  fetchUsdCopRate(): Promise<FetchedExchangeRate>;
}

type FetchLike = (
  input: string,
  init?: { signal?: AbortSignal; headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export class FrankfurterExchangeRateProvider implements ExchangeRateProvider {
  constructor(
    private readonly baseUrl: string = FRANKFURTER_BASE_URL,
    private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike,
    private readonly timeoutMs: number = EXCHANGE_RATE_TIMEOUT_MS,
  ) {}

  async fetchUsdCopRate(): Promise<FetchedExchangeRate> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/v2/rate/USD/COP`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') {
        throw new ExchangeRateProviderError('timeout', 'The exchange-rate request timed out.');
      }
      throw new ExchangeRateProviderError('network', 'Could not reach the exchange-rate service.');
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new ExchangeRateProviderError('http', 'The exchange-rate service returned an error.');
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ExchangeRateProviderError('invalid_response', 'The exchange-rate response was not valid.');
    }

    return mapFrankfurterResponse(payload);
  }
}

export function mapFrankfurterResponse(payload: unknown): FetchedExchangeRate {
  if (typeof payload !== 'object' || payload === null) {
    throw new ExchangeRateProviderError('invalid_response', 'The exchange-rate response was not valid.');
  }
  const record = payload as Record<string, unknown>;
  if (record.base !== 'USD' || record.quote !== 'COP') {
    throw new ExchangeRateProviderError('invalid_response', 'The exchange-rate response used an unexpected currency pair.');
  }
  if (typeof record.date !== 'string' || !isValidCalendarDate(record.date)) {
    throw new ExchangeRateProviderError('invalid_response', 'The exchange-rate response had an invalid date.');
  }
  const rate = record.rate;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new ExchangeRateProviderError('invalid_response', 'The exchange-rate response had an invalid rate.');
  }
  const rateScaled = Math.round(rate * DEFAULT_RATE_SCALE);
  if (!Number.isSafeInteger(rateScaled) || rateScaled <= 0) {
    throw new ExchangeRateProviderError('unsupported_rate', 'The exchange rate is outside the supported range.');
  }
  return {
    baseCurrencyCode: 'USD',
    quoteCurrencyCode: 'COP',
    rateScaled,
    rateScale: DEFAULT_RATE_SCALE,
    effectiveDate: record.date,
    provider: 'frankfurter',
  };
}
