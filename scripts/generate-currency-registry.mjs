// Generates src/features/currency/currency-registry.ts from Frankfurter's active
// currency list plus ICU minor-unit data. Run manually; the output is committed.
import { writeFileSync } from 'node:fs';

// Currencies whose stored representation must never change, because existing rows
// are already integers in these units. ICU disagrees about COP (it says centavos);
// the app has always stored whole pesos.
const PINNED = {
  COP: { fractionDigits: 0, symbol: '$', locale: 'es-CO', decimalSeparator: ',', name: 'Colombian peso' },
  USD: { fractionDigits: 2, symbol: 'US$', locale: 'en-US', decimalSeparator: '.', name: 'US dollar' },
};

// Frankfurter quotes these, but they are not spendable currencies: the metals are
// priced per troy ounce and XDR is an IMF unit of account. Neither has minor units,
// so neither fits the integer-minor-unit money model.
const NOT_SPENDABLE = new Set(['XAG', 'XAU', 'XPD', 'XPT', 'XDR']);

const response = await fetch('https://api.frankfurter.dev/v2/currencies');
const list = (await response.json()).filter((entry) => !NOT_SPENDABLE.has(entry.iso_code));

function fractionDigitsFor(code) {
  const resolved = new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions();
  return resolved.minimumFractionDigits;
}

const rows = list
  .map((entry) => {
    const code = entry.iso_code;
    const pinned = PINNED[code];
    const fractionDigits = pinned ? pinned.fractionDigits : fractionDigitsFor(code);
    return {
      code,
      name: pinned ? pinned.name : entry.name,
      symbol: pinned ? pinned.symbol : (entry.symbol || code),
      fractionDigits,
      minorUnitFactor: 10 ** fractionDigits,
      // Display grouping. Only pinned currencies vary: the money parser accepts a
      // dot decimal separator only, so every other currency uses the matching
      // dot-decimal convention to keep what is shown equal to what is typed.
      locale: pinned ? pinned.locale : 'en-US',
      decimalSeparator: pinned ? pinned.decimalSeparator : '.',
    };
  })
  .sort((a, b) => a.code.localeCompare(b.code));

const digitHistogram = rows.reduce((acc, row) => {
  acc[row.fractionDigits] = (acc[row.fractionDigits] ?? 0) + 1;
  return acc;
}, {});

console.log('currencies:', rows.length);
console.log('fractionDigits histogram:', digitHistogram);
console.log('sample:', rows.filter((r) => ['COP', 'USD', 'EUR', 'JPY', 'BHD', 'CLP', 'AED'].includes(r.code)));

const codes = rows.map((r) => `'${r.code}'`).join(', ');

const definitions = rows
  .map((row) => `  ${row.code}: { code: '${row.code}', name: ${JSON.stringify(row.name)}, symbol: ${JSON.stringify(row.symbol)}, fractionDigits: ${row.fractionDigits}, minorUnitFactor: ${row.minorUnitFactor}, locale: '${row.locale}', decimalSeparator: '${row.decimalSeparator}' },`)
  .join('\n');

const file = `/**
 * Central registry of the currencies Money Control supports.
 *
 * GENERATED. Regenerate with scripts/generate-currency-registry.mjs, which reads
 * Frankfurter's active currency list and ICU minor-unit data. Hand edits to the
 * table below are lost; change the generator instead.
 *
 * Every monetary amount is stored as an integer count of the currency's minor
 * units, so \`fractionDigits\` defines what a stored integer *means*. It is frozen
 * once shipped: changing a currency from 0 to 2 digits silently rescales every
 * existing row by 100. \`tests/currency.test.mjs\` pins these values for exactly
 * that reason.
 *
 * COP is deliberately \`fractionDigits: 0\` — whole pesos, not centavos — even
 * though ISO 4217 and ICU say 2. Existing rows are whole pesos.
 *
 * Fraction-digit and formatting rules live here only; screens and repositories
 * must not duplicate them.
 * See docs/decisions/0008-configurable-base-currency.md.
 */

export const supportedCurrencyCodes = [${codes}] as const;

export type CurrencyCode = (typeof supportedCurrencyCodes)[number];

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
${definitions}
};

export function isSupportedCurrency(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(DEFINITIONS, value);
}

export function getCurrency(code: CurrencyCode): CurrencyDefinition {
  const definition = DEFINITIONS[code];
  if (!definition) throw new Error(\`Unsupported currency code: \${String(code)}\`);
  return definition;
}

export function listCurrencies(): CurrencyDefinition[] {
  return supportedCurrencyCodes.map((code) => DEFINITIONS[code]);
}
`;

writeFileSync(process.argv[2], file, 'utf8');
console.log('wrote', process.argv[2]);
