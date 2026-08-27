/**
 * The device's base currency, cached for synchronous reads.
 *
 * Almost every screen needs to know the base currency while rendering — to decide
 * whether an amount needs converting, whether an account is foreign, which label
 * to put on a consolidated total. Doing that with an async database read at each
 * call site would mean threading a promise through the entire UI, so the single
 * `app_settings` row is loaded once during database initialization and cached
 * here.
 *
 * Reading before that load throws rather than falling back to a default. A guessed
 * base currency does not fail loudly: it silently converts amounts that need no
 * conversion, labels the user's own currency "foreign", and writes wrong
 * `base_amount_minor` snapshots that no later fix can distinguish from real ones.
 * `DatabaseGate` renders nothing until initialization finishes, so any read that
 * throws here is a genuine ordering bug.
 */
import type { CurrencyCode } from '@/features/currency/currency';

let cached: CurrencyCode | undefined;
const listeners = new Set<() => void>();

export class BaseCurrencyNotLoadedError extends Error {
  readonly isBaseCurrencyNotLoadedError = true;

  constructor() {
    super('The base currency was read before the database finished initializing.');
  }
}

/** The base currency. Throws if the cache has not been primed yet. */
export function getBaseCurrency(): CurrencyCode {
  if (cached === undefined) throw new BaseCurrencyNotLoadedError();
  return cached;
}

/** True when `code` is the base currency, i.e. needs no conversion. */
export function isBaseCurrency(code: CurrencyCode): boolean {
  return code === getBaseCurrency();
}

/** Whether the cache has been primed. Only initialization and tests need this. */
export function isBaseCurrencyLoaded(): boolean {
  return cached !== undefined;
}

/** Seed or update the cache and wake every subscriber. */
export function primeBaseCurrency(code: CurrencyCode): void {
  if (cached === code) return;
  cached = code;
  for (const listener of [...listeners]) listener();
}

/** Reset to the unloaded state. Tests only. */
export function resetBaseCurrencyCache(): void {
  cached = undefined;
}

export function subscribeToBaseCurrency(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
