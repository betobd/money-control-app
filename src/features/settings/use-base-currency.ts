import { useSyncExternalStore } from 'react';

import type { CurrencyCode } from '@/features/currency/currency';
import { getBaseCurrency, subscribeToBaseCurrency } from './base-currency';

/**
 * The device's base currency, re-rendering the caller when it changes.
 *
 * `useSyncExternalStore` rather than state plus an effect: the cache is primed
 * before any screen mounts, so an effect-based read would render one frame with
 * a placeholder currency and then correct itself.
 */
export function useBaseCurrency(): CurrencyCode {
  return useSyncExternalStore(subscribeToBaseCurrency, getBaseCurrency, getBaseCurrency);
}
