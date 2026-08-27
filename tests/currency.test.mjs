import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCurrency,
  isSupportedCurrency,
  listCurrencies,
  supportedCurrencyCodes,
} from '../src/features/currency/currency-registry.ts';
import { parseMoney } from '../src/features/currency/money-parser.ts';
import {
  accessibleMoney,
  formatMoney,
  formatMoneyNumber,
  formatMoneyWithSymbol,
} from '../src/features/currency/money-formatter.ts';
import {
  convertMinor,
  CurrencyConversionError,
  describeRate,
  deriveEffectiveRate,
  formatExchangeRate,
  invertRate,
  isValidScaledRate,
  parseExchangeRate,
  toBaseCurrencyMinor,
} from '../src/features/currency/currency-conversion.service.ts';

/** 1 USD = 4,100.0000 COP. */
const USD_COP = { baseCurrencyCode: 'USD', quoteCurrencyCode: 'COP', rateScaled: 41000000, rateScale: 10000 };
const directed = (rateScaled, rateScale = 10000) =>
  ({ baseCurrencyCode: 'USD', quoteCurrencyCode: 'COP', rateScaled, rateScale });

test('registry: supports the full currency set the rate provider covers', () => {
  assert.equal(isSupportedCurrency('COP'), true);
  assert.equal(isSupportedCurrency('USD'), true);
  assert.equal(isSupportedCurrency('EUR'), true);
  assert.equal(isSupportedCurrency('JPY'), true);
  assert.equal(isSupportedCurrency('eur'), false);
  assert.equal(isSupportedCurrency('XAU'), false, 'gold is priced per ounce, not a spendable currency');
  assert.equal(isSupportedCurrency(123), false);
  assert.equal(isSupportedCurrency('toString'), false, 'inherited object keys are not currencies');
  assert.equal(listCurrencies().length, supportedCurrencyCodes.length);
  assert.ok(supportedCurrencyCodes.length > 100, 'the registry should cover the provider list');
  for (const definition of listCurrencies()) {
    assert.equal(
      definition.minorUnitFactor,
      10 ** definition.fractionDigits,
      definition.code + ': minorUnitFactor must match fractionDigits',
    );
  }
});

/**
 * `fractionDigits` defines what a stored integer *means*, so it is frozen once
 * shipped: flipping COP from 0 to 2 would silently divide every existing amount
 * by 100. This pins the values the app's stored data depends on. If regenerating
 * the registry changes one of these, the data needs migrating, not the test.
 */
test('registry: stored precision of currencies in use is frozen', () => {
  assert.equal(getCurrency('COP').fractionDigits, 0, 'COP is stored in whole pesos, not centavos');
  assert.equal(getCurrency('COP').minorUnitFactor, 1);
  assert.equal(getCurrency('USD').fractionDigits, 2);
  assert.equal(getCurrency('USD').minorUnitFactor, 100);
  assert.equal(getCurrency('EUR').fractionDigits, 2);
  assert.equal(getCurrency('JPY').fractionDigits, 0);
  assert.equal(getCurrency('CLP').fractionDigits, 0);
  assert.equal(getCurrency('BHD').fractionDigits, 3);
  assert.equal(getCurrency('BHD').minorUnitFactor, 1000);
});

test('parse COP: whole pesos only, thousands separators allowed', () => {
  assert.deepEqual(parseMoney('1000', 'COP'), { ok: true, minor: 1000 });
  assert.deepEqual(parseMoney('1,000', 'COP'), { ok: true, minor: 1000 });
  assert.deepEqual(parseMoney('1250000', 'COP'), { ok: true, minor: 1250000 });
  assert.deepEqual(parseMoney('  1,250,000 ', 'COP'), { ok: true, minor: 1250000 });
});

test('parse COP: reject fractional input', () => {
  assert.deepEqual(parseMoney('1000.50', 'COP'), { ok: false, reason: 'invalid_format' });
  assert.deepEqual(parseMoney('0.5', 'COP'), { ok: false, reason: 'invalid_format' });
});

test('parse USD: up to two decimals, convert to cents', () => {
  assert.deepEqual(parseMoney('1000', 'USD'), { ok: true, minor: 100000 });
  assert.deepEqual(parseMoney('1000.5', 'USD'), { ok: true, minor: 100050 });
  assert.deepEqual(parseMoney('1000.50', 'USD'), { ok: true, minor: 100050 });
  assert.deepEqual(parseMoney('1,000.50', 'USD'), { ok: true, minor: 100050 });
  assert.deepEqual(parseMoney('0.01', 'USD'), { ok: true, minor: 1 });
  assert.deepEqual(parseMoney('2500.75', 'USD'), { ok: true, minor: 250075 });
});

test('parse USD: reject more than two decimals', () => {
  assert.deepEqual(parseMoney('1000.501', 'USD'), { ok: false, reason: 'too_many_decimals' });
});

test('parse: empty, negative policy, and safe-integer boundary', () => {
  assert.deepEqual(parseMoney('', 'COP'), { ok: false, reason: 'empty' });
  assert.deepEqual(parseMoney('   ', 'USD'), { ok: false, reason: 'empty' });
  assert.deepEqual(parseMoney('-5000', 'COP'), { ok: false, reason: 'negative_not_allowed' });
  assert.deepEqual(parseMoney('-5000', 'COP', { allowNegative: true }), { ok: true, minor: -5000 });
  assert.deepEqual(parseMoney('99999999999999999999', 'COP'), { ok: false, reason: 'not_safe_integer' });
  assert.deepEqual(parseMoney('abc', 'USD'), { ok: false, reason: 'invalid_format' });
});

test('format COP: no decimals, es-CO grouping, sign', () => {
  assert.equal(formatMoneyNumber(1250000, 'COP'), '1.250.000');
  assert.equal(formatMoney(1250000, 'COP'), 'COP 1.250.000');
  assert.equal(formatMoneyWithSymbol(3000000, 'COP'), '$3.000.000');
  assert.equal(formatMoneyWithSymbol(-3000000, 'COP'), '-$3.000.000');
});

test('format USD: two decimals, en-US grouping, code and symbol', () => {
  assert.equal(formatMoneyNumber(250075, 'USD'), '2,500.75');
  assert.equal(formatMoney(250075, 'USD'), 'USD 2,500.75');
  assert.equal(formatMoney(125050, 'USD'), 'USD 1,250.50');
  assert.equal(formatMoneyWithSymbol(100000, 'USD'), 'US$1,000.00');
  assert.equal(formatMoneyNumber(5, 'USD'), '0.05');
});

test('accessible formatting includes currency name', () => {
  assert.equal(accessibleMoney(1250000, 'COP'), '1.250.000 Colombian pesos');
  assert.equal(accessibleMoney(250075, 'USD'), '2,500.75 US dollars');
});

test('convert USD->COP: exact and rounding half away from zero', () => {
  // USD 1,000.00 (100000 minor) at 4100 -> COP 4,100,000
  assert.equal(convertMinor(100000, 'USD', 'COP', USD_COP), 4100000);
  // USD 25.00 at 4100 -> COP 102,500
  assert.equal(convertMinor(2500, 'USD', 'COP', USD_COP), 102500);
  // Below-half rounds down: 1 cent at 0.5 COP/USD -> 0.005 COP -> 0
  assert.equal(convertMinor(1, 'USD', 'COP', directed(5000)), 0);
  // Exact midpoint rounds away from zero: 1 cent at 150 COP/USD -> 1.5 COP -> 2
  assert.equal(convertMinor(1, 'USD', 'COP', directed(1500000)), 2);
});

test('convert: negative amounts round symmetrically (away from zero)', () => {
  assert.equal(convertMinor(-1, 'USD', 'COP', directed(1500000)), -2);
});

test('convert: a rate applies in either direction, and only to its own pair', () => {
  // The same USD/COP rate converts COP back to USD without being restated.
  assert.equal(convertMinor(4100000, 'COP', 'USD', USD_COP), 100000);
  // Same currency needs no rate and is returned untouched.
  assert.equal(convertMinor(1234, 'USD', 'USD', USD_COP), 1234);
  // A rate for an unrelated pair is an error, not a silent passthrough: it would
  // otherwise produce a plausible number from the wrong exchange rate.
  assert.throws(() => convertMinor(1000, 'EUR', 'JPY', USD_COP), CurrencyConversionError);
});

test('convert: currencies with different precision convert correctly', () => {
  // 1 USD = 150 JPY. USD 10.00 (1000 minor, 2 digits) -> JPY 1,500 (1500 minor, 0 digits).
  const usdJpy = { baseCurrencyCode: 'USD', quoteCurrencyCode: 'JPY', rateScaled: 1500000, rateScale: 10000 };
  assert.equal(convertMinor(1000, 'USD', 'JPY', usdJpy), 1500);
  assert.equal(convertMinor(1500, 'JPY', 'USD', usdJpy), 1000);
});

test('toBaseCurrencyMinor: base passthrough, foreign requires a rate', () => {
  assert.equal(toBaseCurrencyMinor(500000, 'COP', 'COP'), 500000);
  assert.equal(toBaseCurrencyMinor(100000, 'USD', 'COP', USD_COP), 4100000);
  assert.throws(() => toBaseCurrencyMinor(100000, 'USD', 'COP'), CurrencyConversionError);
});

test('derive cross-currency effective rate from actual amounts', () => {
  // COP 4,150,000 -> USD 1,000.00 => 4,150 COP per USD.
  const rate = deriveEffectiveRate(4150000, 'COP', 100000, 'USD');
  assert.equal(rate.rateScale, 10000);
  assert.equal(rate.rateScaled, 41500000);
  // Stated as USD->COP even though the transfer went COP->USD: four decimals
  // cannot hold 0.000241 usefully, and the pair travels with the rate.
  assert.equal(rate.baseCurrencyCode, 'USD');
  assert.equal(rate.quoteCurrencyCode, 'COP');
  assert.equal(formatExchangeRate(rate), '4,150');
  // Either orientation of the transfer derives the same rate.
  assert.deepEqual(deriveEffectiveRate(100000, 'USD', 4150000, 'COP'), rate);
  assert.throws(() => deriveEffectiveRate(1000, 'USD', 1000, 'USD'), CurrencyConversionError);
});

test('invertRate restates a rate without changing what it means', () => {
  const inverted = invertRate({
    baseCurrencyCode: 'EUR', quoteCurrencyCode: 'USD', rateScaled: 20000, rateScale: 10000,
  });
  assert.equal(inverted.baseCurrencyCode, 'USD');
  assert.equal(inverted.quoteCurrencyCode, 'EUR');
  assert.equal(inverted.rateScaled, 5000); // 1 EUR = 2 USD  <->  1 USD = 0.5 EUR
});

test('describeRate names the pair so the number cannot be read backwards', () => {
  assert.equal(describeRate(USD_COP), 'COP 4,100 / USD');
});

test('overflow rejection on conversion', () => {
  assert.throws(
    () => convertMinor(Number.MAX_SAFE_INTEGER, 'USD', 'COP', USD_COP),
    CurrencyConversionError,
  );
});

test('parse exchange rate: decimals, positivity, precision', () => {
  assert.deepEqual(parseExchangeRate('4102.3456'), { ok: true, rateScaled: 41023456, rateScale: 10000 });
  assert.deepEqual(parseExchangeRate('4100'), { ok: true, rateScaled: 41000000, rateScale: 10000 });
  assert.deepEqual(parseExchangeRate('4,100.5'), { ok: true, rateScaled: 41005000, rateScale: 10000 });
  assert.deepEqual(parseExchangeRate('0'), { ok: false, reason: 'not_positive' });
  assert.deepEqual(parseExchangeRate('-5'), { ok: false, reason: 'invalid_format' });
  assert.deepEqual(parseExchangeRate('4100.12345'), { ok: false, reason: 'too_many_decimals' });
  assert.deepEqual(parseExchangeRate(''), { ok: false, reason: 'empty' });
});

test('format exchange rate trims trailing zeros', () => {
  assert.equal(formatExchangeRate({ rateScaled: 41023456, rateScale: 10000 }), '4,102.3456');
  assert.equal(formatExchangeRate({ rateScaled: 41000000, rateScale: 10000 }), '4,100');
  assert.equal(formatExchangeRate({ rateScaled: 41005000, rateScale: 10000 }), '4,100.5');
});

test('isValidScaledRate guards', () => {
  assert.equal(isValidScaledRate({ rateScaled: 1, rateScale: 10000 }), true);
  assert.equal(isValidScaledRate({ rateScaled: 0, rateScale: 10000 }), false);
  assert.equal(isValidScaledRate({ rateScaled: 100, rateScale: 0 }), false);
  assert.equal(isValidScaledRate({ rateScaled: -1, rateScale: 10000 }), false);
});
