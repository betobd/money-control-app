/**
 * Centralized currency conversion and exchange-rate arithmetic.
 *
 * Exchange rates are never floating-point. A rate is a scaled integer:
 * `rate = rateScaled / rateScale`, with `rateScale = 10000` (four decimal places),
 * so `COP 4,102.3456 per USD` is `rateScaled = 41023456, rateScale = 10000`.
 *
 * A bare scaled number is not a rate: 4102.3456 is meaningless without knowing it
 * is COP per USD rather than the reverse. Every rate that crosses a module
 * boundary is a {@link DirectedRate}, read as **1 base = rate quote**.
 *
 * Conversion uses BigInt intermediates and one deterministic rounding policy —
 * round half away from zero — everywhere, then asserts a safe-integer result.
 * No screen, component, repository, report, budget, or export duplicates these
 * formulas.
 *
 * Nothing here knows which currency is the base. That is a user setting; these
 * functions take it as an argument so the arithmetic stays pure and testable.
 * See docs/decisions/0008-configurable-base-currency.md.
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

/** A rate that knows which way round it goes: 1 `base` = rate `quote`. */
export type DirectedRate = ScaledRate & {
  baseCurrencyCode: CurrencyCode;
  quoteCurrencyCode: CurrencyCode;
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

/** The same rate stated the other way round: 1 quote = (1/rate) base. */
export function invertRate(rate: DirectedRate): DirectedRate {
  assertValidRate(rate);
  return {
    baseCurrencyCode: rate.quoteCurrencyCode,
    quoteCurrencyCode: rate.baseCurrencyCode,
    // Keep the scale and move the ratio, so an inverted rate is still an exact
    // scaled integer rather than a re-rounded decimal.
    rateScaled: toSafeNumber(
      roundedDivide(BigInt(rate.rateScale) * BigInt(rate.rateScale), BigInt(rate.rateScaled)),
    ),
    rateScale: rate.rateScale,
  };
}

/**
 * Convert an amount in `from` minor units into `to` minor units.
 *
 * The rate may be given in either direction; it is applied as written or
 * inverted, whichever matches. A rate for an unrelated pair is an error rather
 * than a silent no-op — passing the wrong rate should not quietly produce a
 * plausible number.
 */
export function convertMinor(
  amountMinor: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rate: DirectedRate,
): number {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new CurrencyConversionError('Amount must be a safe integer.');
  }
  if (from === to) return amountMinor;
  assertValidRate(rate);

  const fromFactor = BigInt(getCurrency(from).minorUnitFactor);
  const toFactor = BigInt(getCurrency(to).minorUnitFactor);
  const amount = BigInt(amountMinor);
  const scaled = BigInt(rate.rateScaled);
  const scale = BigInt(rate.rateScale);

  if (rate.baseCurrencyCode === from && rate.quoteCurrencyCode === to) {
    // 1 from = rate to  ->  multiply.
    return toSafeNumber(roundedDivide(amount * scaled * toFactor, fromFactor * scale));
  }
  if (rate.baseCurrencyCode === to && rate.quoteCurrencyCode === from) {
    // 1 to = rate from  ->  divide.
    return toSafeNumber(roundedDivide(amount * scale * toFactor, fromFactor * scaled));
  }
  throw new CurrencyConversionError(
    `A ${rate.baseCurrencyCode}/${rate.quoteCurrencyCode} rate cannot convert ${from} to ${to}.`,
  );
}

/**
 * Convert a native minor-unit amount into the base currency's minor units.
 * An amount already in the base currency is returned unchanged and needs no rate.
 */
export function toBaseCurrencyMinor(
  nativeMinor: number,
  code: CurrencyCode,
  baseCode: CurrencyCode,
  rate?: DirectedRate,
): number {
  if (!Number.isSafeInteger(nativeMinor)) {
    throw new CurrencyConversionError('Native amount must be a safe integer.');
  }
  if (code === baseCode) return nativeMinor;
  if (!rate) {
    throw new CurrencyConversionError(`A ${code}/${baseCode} exchange rate is required to convert ${code}.`);
  }
  return convertMinor(nativeMinor, code, baseCode, rate);
}

/**
 * Derive the effective rate a cross-currency transfer actually settled at, from
 * its two authoritative leg amounts. Returned as 1 `from` = rate `to`.
 */
export function deriveEffectiveRate(
  fromMinor: number,
  from: CurrencyCode,
  toMinor: number,
  to: CurrencyCode,
): DirectedRate {
  if (!Number.isSafeInteger(fromMinor) || !Number.isSafeInteger(toMinor)) {
    throw new CurrencyConversionError('Transfer amounts must be safe integers.');
  }
  if (fromMinor <= 0 || toMinor <= 0) {
    throw new CurrencyConversionError('Transfer amounts must be positive to derive a rate.');
  }
  if (from === to) {
    throw new CurrencyConversionError('A same-currency transfer has no exchange rate.');
  }
  const fromFactor = BigInt(getCurrency(from).minorUnitFactor);
  const toFactor = BigInt(getCurrency(to).minorUnitFactor);
  const scale = BigInt(DEFAULT_RATE_SCALE);
  // rate = toMajor / fromMajor = (toMinor / toFactor) / (fromMinor / fromFactor)
  const forward = roundedDivide(BigInt(toMinor) * fromFactor * scale, toFactor * BigInt(fromMinor));

  // State the rate in whichever direction gives a value of at least 1. A fixed
  // four-decimal scale keeps barely three digits of a rate like 0.00024, and the
  // pair travels with the rate, so the inverted form is exactly as usable and far
  // more precise.
  if (forward < scale) {
    const inverse = roundedDivide(BigInt(fromMinor) * toFactor * scale, fromFactor * BigInt(toMinor));
    const rateScaled = toSafeNumber(inverse);
    if (rateScaled <= 0) {
      throw new CurrencyConversionError('The derived exchange rate is outside the supported range.');
    }
    return { baseCurrencyCode: to, quoteCurrencyCode: from, rateScaled, rateScale: DEFAULT_RATE_SCALE };
  }

  const rateScaled = toSafeNumber(forward);
  if (rateScaled <= 0) {
    throw new CurrencyConversionError('The derived exchange rate is outside the supported range.');
  }
  return { baseCurrencyCode: from, quoteCurrencyCode: to, rateScaled, rateScale: DEFAULT_RATE_SCALE };
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

/**
 * A rate written so it cannot be read backwards, e.g. `COP 4,102.3456 / USD`.
 * Screens must not assemble this themselves: the pair is what makes the number
 * mean anything.
 */
export function describeRate(rate: DirectedRate): string {
  return `${rate.quoteCurrencyCode} ${formatExchangeRate(rate)} / ${rate.baseCurrencyCode}`;
}
