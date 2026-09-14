/**
 * Centralized, currency-aware money formatting.
 *
 * Amounts are integer minor units. The number of fraction digits, grouping locale,
 * decimal separator, and symbol come from the currency registry so screens never
 * hardcode formatting. Raw minor-unit values are never shown to users.
 *
 * - `formatMoneyNumber` -> grouped number only, e.g. COP `1.250.000`, USD `1,250.50`.
 * - `formatMoney` -> currency code + number, e.g. `COP 1.250.000`, `USD 1,250.50`.
 *   Prefer this where the currency is otherwise ambiguous; the `$` symbol alone is
 *   ambiguous across currencies.
 * - `formatMoneyWithSymbol` -> symbol + number, e.g. `$1.250.000`, `US$1,250.50`.
 * - `accessibleMoney` -> screen-reader text including the currency name, e.g.
 *   `1.250.000 Colombian pesos`.
 */
import { getMessages } from '@/i18n/messages';
import { currencyName } from './currency-name';
import { getCurrency, type CurrencyCode } from './currency-registry';

function splitMinor(minor: number, factor: number): { negative: boolean; whole: number; fraction: number } {
  const negative = minor < 0;
  const absolute = Math.abs(minor);
  return {
    negative,
    whole: Math.trunc(absolute / factor),
    fraction: absolute % factor,
  };
}

export function formatMoneyNumber(minor: number, code: CurrencyCode): string {
  const definition = getCurrency(code);
  const { negative, whole, fraction } = splitMinor(minor, definition.minorUnitFactor);
  let text = whole.toLocaleString(definition.locale, { maximumFractionDigits: 0 });
  if (definition.fractionDigits > 0) {
    const fractionText = String(fraction).padStart(definition.fractionDigits, '0');
    text = `${text}${definition.decimalSeparator}${fractionText}`;
  }
  return negative ? `-${text}` : text;
}

export function formatMoney(minor: number, code: CurrencyCode): string {
  return `${code} ${formatMoneyNumber(minor, code)}`;
}

export function formatMoneyWithSymbol(minor: number, code: CurrencyCode): string {
  const definition = getCurrency(code);
  const { negative } = splitMinor(minor, definition.minorUnitFactor);
  const number = formatMoneyNumber(Math.abs(minor), code);
  return `${negative ? '-' : ''}${definition.symbol}${number}`;
}

export function accessibleMoney(minor: number, code: CurrencyCode): string {
  const definition = getCurrency(code);
  return getMessages().currency.accessibleMoney(
    formatMoneyNumber(minor, code),
    definition.name,
    currencyName(code),
    Math.abs(minor) === definition.minorUnitFactor,
  );
}
