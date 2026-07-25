/**
 * Centralized, string-based money parsing.
 *
 * Never use `parseFloat` as authoritative money parsing. Input is normalized by
 * removing spaces and thousands separators (`,`), then validated against the
 * target currency's precision before being converted to integer minor units:
 *
 * - COP (fractionDigits 0): whole units only. `1000`, `1,000`, `1250000` are
 *   valid; `1000.50`, `0.5` are rejected.
 * - USD (fractionDigits 2): up to two decimal places. `1000`, `1000.5`,
 *   `1000.50`, `1,000.50` are valid; `1000.501` is rejected.
 *
 * The comma is always treated as a thousands separator and the dot as the decimal
 * separator, so parsing is never ambiguous between the two. Callers that display
 * locale-grouped input strip separators before storing; this parser accepts either
 * grouped or ungrouped input.
 */
import { getCurrency, type CurrencyCode } from './currency-registry';

export type MoneyParseFailure =
  | 'empty'
  | 'invalid_format'
  | 'too_many_decimals'
  | 'negative_not_allowed'
  | 'not_safe_integer';

export type MoneyParseResult =
  | { ok: true; minor: number }
  | { ok: false; reason: MoneyParseFailure };

export type MoneyParseOptions = {
  allowNegative?: boolean;
};

export function parseMoney(
  raw: string,
  code: CurrencyCode,
  options: MoneyParseOptions = {},
): MoneyParseResult {
  const definition = getCurrency(code);
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: 'empty' };

  // Remove spaces and thousands separators; keep an optional sign, digits, dot.
  const normalized = trimmed.replace(/\s/g, '').replace(/,/g, '');

  const pattern = definition.fractionDigits === 0
    ? /^(-?)(\d+)$/
    : new RegExp(`^(-?)(\\d+)(?:\\.(\\d{1,${definition.fractionDigits}}))?$`);

  // A dot present for a zero-fraction currency, or too many decimals, are format
  // errors. Distinguish "too many decimals" for a clearer message where possible.
  if (!pattern.test(normalized)) {
    if (definition.fractionDigits > 0 && /^-?\d+\.\d+$/.test(normalized)) {
      return { ok: false, reason: 'too_many_decimals' };
    }
    return { ok: false, reason: 'invalid_format' };
  }

  const match = pattern.exec(normalized);
  if (!match) return { ok: false, reason: 'invalid_format' };

  const sign = match[1] === '-' ? -1 : 1;
  if (sign < 0 && !options.allowNegative) {
    return { ok: false, reason: 'negative_not_allowed' };
  }

  const whole = match[2];
  const fraction = (match[3] ?? '').padEnd(definition.fractionDigits, '0');
  const combined = `${whole}${fraction}`; // digits of the minor-unit magnitude

  // Guard against precision loss before Number() (very long inputs).
  if (combined.length > 16) return { ok: false, reason: 'not_safe_integer' };

  const magnitude = Number(combined);
  const minor = sign * magnitude;
  if (!Number.isSafeInteger(minor)) return { ok: false, reason: 'not_safe_integer' };

  return { ok: true, minor };
}
