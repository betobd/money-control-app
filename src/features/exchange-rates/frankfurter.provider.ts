/**
 * Fetches reference rates from Frankfurter and maps them to the internal
 * scaled-integer model. Network-only: no SQLite access, no React state. Sends only
 * currency codes — never any account, transaction, or user data. The raw response
 * number is never persisted; it is converted immediately to a scaled integer.
 * Frankfurter provides a reference rate, not a live/guaranteed bank rate.
 */
import { isSupportedCurrency, type CurrencyCode } from '@/features/currency/currency';
import { isValidCalendarDate } from '@/features/transactions/transaction-date';
import type { FetchedExchangeRate } from './exchange-rate.types';

export const FRANKFURTER_BASE_URL = 'https://api.frankfurter.dev';
export const EXCHANGE_RATE_TIMEOUT_MS = 10_000;

/**
 * Scale chosen per rate rather than fixed.
 *
 * A single fixed scale cannot serve every pair: at four decimals, `1 COP =
 * 0.00024 USD` keeps two significant digits and rounds a balance into nonsense,
 * while `1 USD = 4,102.3456 COP` needs no more than four. The scale starts at four
 * decimals and is raised only while the scaled value would carry fewer than
 * `MIN_SIGNIFICANT_DIGITS` digits — raising it further would append zeros the
 * provider never sent. The scale travels with the rate in its own column.
 */
const MIN_SIGNIFICANT_DIGITS = 5;
const MIN_RATE_SCALE = 10_000;
const MAX_RATE_SCALE = 1_000_000_000_000; // 1e12, well inside the safe-integer range

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
  /** The rate for "1 base = ? quote". */
  fetchRate(base: CurrencyCode, quote: CurrencyCode): Promise<FetchedExchangeRate>;
}

type FetchLike = (
  input: string,
  init?: { signal?: AbortSignal; headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/** Pick the smallest scale that keeps enough significant digits for this rate. */
export function scaleFor(rate: number): number {
  let scale = MIN_RATE_SCALE;
  while (scale < MAX_RATE_SCALE && rate * scale < 10 ** (MIN_SIGNIFICANT_DIGITS - 1)) {
    scale *= 10;
  }
  return scale;
}

export class FrankfurterExchangeRateProvider implements ExchangeRateProvider {
  constructor(
    private readonly baseUrl: string = FRANKFURTER_BASE_URL,
    private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike,
    private readonly timeoutMs: number = EXCHANGE_RATE_TIMEOUT_MS,
  ) {}

  async fetchRate(base: CurrencyCode, quote: CurrencyCode): Promise<FetchedExchangeRate> {
    if (base === quote) {
      throw new ExchangeRateProviderError('unsupported_rate', 'A currency has no exchange rate against itself.');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/v2/rate/${base}/${quote}`, {
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

    return mapFrankfurterResponse(payload, base, quote);
  }
}

export function mapFrankfurterResponse(
  payload: unknown,
  expectedBase: CurrencyCode,
  expectedQuote: CurrencyCode,
): FetchedExchangeRate {
  if (typeof payload !== 'object' || payload === null) {
    throw new ExchangeRateProviderError('invalid_response', 'The exchange-rate response was not valid.');
  }
  const record = payload as Record<string, unknown>;
  // Verify the response describes the pair that was asked for. A provider that
  // silently substitutes a different base would otherwise be stored as if it had
  // answered the question.
  if (record.base !== expectedBase || record.quote !== expectedQuote) {
    throw new ExchangeRateProviderError('invalid_response', 'The exchange-rate response used an unexpected currency pair.');
  }
  if (!isSupportedCurrency(record.base) || !isSupportedCurrency(record.quote)) {
    throw new ExchangeRateProviderError('invalid_response', 'The exchange-rate response used an unsupported currency.');
  }
  if (typeof record.date !== 'string' || !isValidCalendarDate(record.date)) {
    throw new ExchangeRateProviderError('invalid_response', 'The exchange-rate response had an invalid date.');
  }
  const rate = record.rate;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new ExchangeRateProviderError('invalid_response', 'The exchange-rate response had an invalid rate.');
  }
  const rateScale = scaleFor(rate);
  const rateScaled = Math.round(rate * rateScale);
  if (!Number.isSafeInteger(rateScaled) || rateScaled <= 0) {
    throw new ExchangeRateProviderError('unsupported_rate', 'The exchange rate is outside the supported range.');
  }
  return {
    baseCurrencyCode: record.base,
    quoteCurrencyCode: record.quote,
    rateScaled,
    rateScale,
    effectiveDate: record.date,
    provider: 'frankfurter',
  };
}
