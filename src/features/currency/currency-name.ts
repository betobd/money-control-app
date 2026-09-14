import { getLanguage } from '@/i18n/messages';
import { localizedCurrencyNames } from './currency-names.generated';
import { getCurrency, type CurrencyCode } from './currency-registry';

/**
 * The currency's display name in the active interface language, e.g. COP is
 * "Colombian Peso" in English and "peso colombiano" in Spanish. Falls back to the
 * registry's English name. Use this for anything shown to the user; the registry
 * `name` is the stable English source.
 */
export function currencyName(code: CurrencyCode): string {
  return localizedCurrencyNames[getLanguage()]?.[code] ?? getCurrency(code).name;
}
