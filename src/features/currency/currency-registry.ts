/**
 * Central registry of the currencies Money Control supports.
 *
 * Multi-Currency v1 supports exactly COP (the fixed base currency) and USD.
 * Every monetary amount is stored as an integer count of the currency's minor
 * units: COP has `minorUnitFactor = 1` (one unit = one whole peso, no fractional
 * part), and USD has `minorUnitFactor = 100` (one unit = one cent). Fraction-digit
 * and formatting rules live here only; screens and repositories must not duplicate
 * them. See docs/decisions/0005-multi-currency-cop-usd.md.
 */

export const supportedCurrencyCodes = ['COP', 'USD'] as const;

export type CurrencyCode = (typeof supportedCurrencyCodes)[number];

/** The single base currency used for all consolidated reporting. Fixed in v1. */
export const BASE_CURRENCY: CurrencyCode = 'COP';

export type CurrencyDefinition = {
  code: CurrencyCode;
  name: string;
  symbol: string;
  fractionDigits: number;
  minorUnitFactor: number;
  locale: string;
  /** Character used between the whole and fractional parts when formatting. */
  decimalSeparator: string;
};

const DEFINITIONS: Record<CurrencyCode, CurrencyDefinition> = {
  COP: {
    code: 'COP',
    name: 'Colombian peso',
    symbol: '$',
    fractionDigits: 0,
    minorUnitFactor: 1,
    locale: 'es-CO',
    decimalSeparator: ',',
  },
  USD: {
    code: 'USD',
    name: 'US dollar',
    symbol: 'US$',
    fractionDigits: 2,
    minorUnitFactor: 100,
    locale: 'en-US',
    decimalSeparator: '.',
  },
};

export function isSupportedCurrency(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (supportedCurrencyCodes as readonly string[]).includes(value);
}

export function getCurrency(code: CurrencyCode): CurrencyDefinition {
  const definition = DEFINITIONS[code];
  if (!definition) throw new Error(`Unsupported currency code: ${String(code)}`);
  return definition;
}

export function listCurrencies(): CurrencyDefinition[] {
  return supportedCurrencyCodes.map((code) => DEFINITIONS[code]);
}
