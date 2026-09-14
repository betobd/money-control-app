import { isSupportedCurrency, type CurrencyCode } from '@/features/currency/currency';

/** The part of an `expo-localization` locale this module reads. */
export type DeviceLocale = { currencyCode: string | null };

/** Used when no device locale names a supported currency. */
export const FALLBACK_BASE_CURRENCY: CurrencyCode = 'USD';

/**
 * The base currency to preselect in onboarding: the currency of the first device
 * locale that has a supported one, in the user's order of preference.
 *
 * Only a suggestion — the user confirms it on the same screen. A phone set to
 * Spanish (Colombia) suggests COP, which is right far more often than a fixed
 * default that every non-US user has to notice and change.
 */
export function suggestBaseCurrency(locales: readonly DeviceLocale[]): CurrencyCode {
  for (const locale of locales) {
    const code = locale.currencyCode?.toUpperCase();
    if (code && isSupportedCurrency(code)) return code;
  }
  return FALLBACK_BASE_CURRENCY;
}
