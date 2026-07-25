/**
 * Centralized currency conversion and exchange-rate arithmetic.
 *
 * Exchange rates are never floating-point. A rate is a scaled integer:
 * `rate = rateScaled / rateScale`. Multi-Currency v1 uses `rateScale = 10000`
 * (four decimal places), so `COP 4,102.3456 per USD` is `rateScaled = 41023456`,
 * `rateScale = 10000`.
 *
 * Conversion uses BigInt intermediates and one deterministic rounding policy —
 * round half away from zero — everywhere, then asserts a safe-integer result.
 * No screen, component, repository, report, budget, or export duplicates these
 * formulas. See docs/decisions/0005-multi-currency-cop-usd.md.
 */
import { getCurrency, type CurrencyCode } from './currency-registry';

export const DEFAULT_RATE_SCALE = 10000;
export const MAX_RATE_DECIMALS = 4;

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

export class CurrencyConversionError extends Error {}

export type ScaledRate = {
  rateScaled: number;
  rateScale: number;
};

export type RateParseResult =
  | { ok: true; rateScaled: number; rateScale: number }
  | { ok: false; reason: 'empty' | 'invalid_format' | 'too_many_decimals' | 'not_positive' | 'not_safe_integer' };

/** Round a BigInt quotient num/den (den > 0) half away from zero. */
function roundedDivide(num: bigint, den: bigint): bigint {
  if (den <= 0n) throw new CurrencyConversionError('Rate denominator must be positive.');
  const negative = num < 0n;
  const magnitude = negative ? -num : num;
  const quotient = magnitude / den;
  const remainder = magnitude % den;
  const rounded = remainder * 2n >= den ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

function toSafeNumber(value: bigint): number {
  if (value > MAX_SAFE || value < -MAX_SAFE) {
    throw new CurrencyConversionError('Converted amount exceeds the supported safe integer range.');
  }
  return Number(value);
}

export function isValidScaledRate(rate: ScaledRate): boolean {
  return (
    Number.isSafeInteger(rate.rateScaled) &&
    Number.isSafeInteger(rate.rateScale) &&
    rate.rateScaled > 0 &&
    rate.rateScale > 0
  );
}

function assertValidRate(rate: ScaledRate): void {
  if (!isValidScaledRate(rate)) {
    throw new CurrencyConversionError('Exchange rate must be a positive scaled integer.');
  }
}

/**
 * Convert a native minor-unit amount to COP base-currency minor units.
 * COP is returned unchanged (it is the base currency); USD requires a rate.
 */
export function toBaseCurrencyMinor(
  nativeMinor: number,
  code: CurrencyCode,
  rate?: ScaledRate,
): number {
  if (!Number.isSafeInteger(nativeMinor)) {
    throw new CurrencyConversionError('Native amount must be a safe integer.');
  }
  if (code === 'COP') return nativeMinor;
  if (!rate) throw new CurrencyConversionError('A USD/COP exchange rate is required to convert USD.');
  return convertUsdMinorToCopMinor(nativeMinor, rate);
}

/** USD minor (cents) -> COP minor (pesos) using the given rate. */
export function convertUsdMinorToCopMinor(usdMinor: number, rate: ScaledRate): number {
  assertValidRate(rate);
  if (!Number.isSafeInteger(usdMinor)) {
    throw new CurrencyConversionError('USD amount must be a safe integer.');
  }
  const usdFactor = BigInt(getCurrency('USD').minorUnitFactor); // 100
  const num = BigInt(usdMinor) * BigInt(rate.rateScaled);
  const den = usdFactor * BigInt(rate.rateScale);
  return toSafeNumber(roundedDivide(num, den));
}

/** COP minor (pesos) -> USD minor (cents) using the given rate. Used for prefill. */
export function convertCopMinorToUsdMinor(copMinor: number, rate: ScaledRate): number {
  assertValidRate(rate);
  if (!Number.isSafeInteger(copMinor)) {
    throw new CurrencyConversionError('COP amount must be a safe integer.');
  }
  const usdFactor = BigInt(getCurrency('USD').minorUnitFactor); // 100
  const num = BigInt(copMinor) * BigInt(rate.rateScale) * usdFactor;
  const den = BigInt(rate.rateScaled);
  return toSafeNumber(roundedDivide(num, den));
}

/**
 * Derive the effective COP-per-USD rate for a cross-currency transfer from its
 * actual source and destination amounts. Exactly one side is COP and one is USD.
 */
export function deriveCrossCurrencyRate(copMinor: number, usdMinor: number): ScaledRate {
  if (!Number.isSafeInteger(copMinor) || !Number.isSafeInteger(usdMinor)) {
    throw new CurrencyConversionError('Transfer amounts must be safe integers.');
  }
  if (copMinor <= 0 || usdMinor <= 0) {
    throw new CurrencyConversionError('Transfer amounts must be positive to derive a rate.');
  }
  const usdFactor = BigInt(getCurrency('USD').minorUnitFactor); // 100
  // rate = copMajor / usdMajor = copMinor / (usdMinor / 100) = copMinor * 100 / usdMinor
  const num = BigInt(copMinor) * usdFactor * BigInt(DEFAULT_RATE_SCALE);
  const den = BigInt(usdMinor);
  const rateScaled = toSafeNumber(roundedDivide(num, den));
  return { rateScaled, rateScale: DEFAULT_RATE_SCALE };
}

/** Parse a decimal rate string (e.g. "4102.3456") into a scaled integer. */
export function parseExchangeRate(raw: string): RateParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: 'empty' };
  const normalized = trimmed.replace(/\s/g, '').replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return { ok: false, reason: 'invalid_format' };
  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > MAX_RATE_DECIMALS) return { ok: false, reason: 'too_many_decimals' };
  const combined = `${whole}${fraction.padEnd(MAX_RATE_DECIMALS, '0')}`;
  if (combined.length > 16) return { ok: false, reason: 'not_safe_integer' };
  const rateScaled = Number(combined);
  if (!Number.isSafeInteger(rateScaled)) return { ok: false, reason: 'not_safe_integer' };
  if (rateScaled <= 0) return { ok: false, reason: 'not_positive' };
  return { ok: true, rateScaled, rateScale: DEFAULT_RATE_SCALE };
}

/** Format a scaled rate as a plain decimal string, trimming trailing zeros. */
export function formatExchangeRate(rate: ScaledRate): string {
  assertValidRate(rate);
  const negative = rate.rateScaled < 0;
  const magnitude = Math.abs(rate.rateScaled);
  const whole = Math.trunc(magnitude / rate.rateScale);
  const fraction = magnitude % rate.rateScale;
  const scaleDigits = String(rate.rateScale).length - 1;
  let text = whole.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (fraction > 0 && scaleDigits > 0) {
    const fractionText = String(fraction).padStart(scaleDigits, '0').replace(/0+$/, '');
    if (fractionText) text = `${text}.${fractionText}`;
  }
  return negative ? `-${text}` : text;
}
