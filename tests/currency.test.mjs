import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BASE_CURRENCY,
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
  convertCopMinorToUsdMinor,
  convertUsdMinorToCopMinor,
  CurrencyConversionError,
  deriveCrossCurrencyRate,
  formatExchangeRate,
  isValidScaledRate,
  parseExchangeRate,
  toBaseCurrencyMinor,
} from '../src/features/currency/currency-conversion.service.ts';

const USD_COP = { rateScaled: 41000000, rateScale: 10000 }; // 4100.0000 COP per USD

test('registry: base currency is COP and both currencies are supported', () => {
  assert.equal(BASE_CURRENCY, 'COP');
  assert.deepEqual([...supportedCurrencyCodes], ['COP', 'USD']);
  assert.equal(isSupportedCurrency('COP'), true);
  assert.equal(isSupportedCurrency('USD'), true);
  assert.equal(isSupportedCurrency('EUR'), false);
  assert.equal(isSupportedCurrency(123), false);
  assert.equal(getCurrency('COP').minorUnitFactor, 1);
  assert.equal(getCurrency('COP').fractionDigits, 0);
  assert.equal(getCurrency('USD').minorUnitFactor, 100);
  assert.equal(getCurrency('USD').fractionDigits, 2);
  assert.equal(listCurrencies().length, 2);
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
  assert.equal(convertUsdMinorToCopMinor(100000, USD_COP), 4100000);
  // USD 25.00 at 4100 -> COP 102,500
  assert.equal(convertUsdMinorToCopMinor(2500, USD_COP), 102500);
  // Below-half rounds down: 1 cent at 0.5 COP/USD -> 0.005 COP -> 0
  const half = { rateScaled: 5000, rateScale: 10000 }; // 0.5 COP per USD
  assert.equal(convertUsdMinorToCopMinor(1, half), 0);
  // Exact midpoint rounds away from zero: 1 cent at 150 COP/USD -> 1.5 COP -> 2
  const oneFifty = { rateScaled: 1500000, rateScale: 10000 }; // 150.0 COP per USD
  assert.equal(convertUsdMinorToCopMinor(1, oneFifty), 2);
});

test('convert: negative amounts round symmetrically (away from zero)', () => {
  const oneFifty = { rateScaled: 1500000, rateScale: 10000 };
  assert.equal(convertUsdMinorToCopMinor(-1, oneFifty), -2);
});

test('toBaseCurrencyMinor: COP passthrough, USD requires rate', () => {
  assert.equal(toBaseCurrencyMinor(500000, 'COP'), 500000);
  assert.equal(toBaseCurrencyMinor(100000, 'USD', USD_COP), 4100000);
  assert.throws(() => toBaseCurrencyMinor(100000, 'USD'), CurrencyConversionError);
});

test('convert COP->USD prefill', () => {
  // COP 4,150,000 at 4150 -> USD 1,000.00
  const rate = { rateScaled: 41500000, rateScale: 10000 };
  assert.equal(convertCopMinorToUsdMinor(4150000, rate), 100000);
});

test('derive cross-currency effective rate from actual amounts', () => {
  // COP 4,150,000 -> USD 1,000.00 => 4150 COP per USD
  const rate = deriveCrossCurrencyRate(4150000, 100000);
  assert.equal(rate.rateScale, 10000);
  assert.equal(rate.rateScaled, 41500000);
  assert.equal(formatExchangeRate(rate), '4,150');
});

test('overflow rejection on conversion', () => {
  assert.throws(
    () => convertUsdMinorToCopMinor(Number.MAX_SAFE_INTEGER, USD_COP),
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
