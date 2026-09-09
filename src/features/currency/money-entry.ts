/**
 * Shared text handling for money entry fields.
 *
 * Two halves of one contract:
 *
 * - state always holds the **raw** entry (digits, an optional leading `-`, and a
 *   single `.` for currencies with minor units). That is what `parseMoney`
 *   accepts, so nothing has to un-format before saving.
 * - the field **displays** {@link formatMoneyEntry} of that raw value, so a
 *   million reads as `1.000.000`, not `1000000`.
 *
 * Keeping display separate from state is what makes grouping safe: the group
 * separator for COP is `.`, which `parseMoney` would reject outright.
 *
 * Four near-identical private copies of the sanitizer used to live in
 * account-form, investment-form, investment-valuation-form and amount-input.
 * Three of them accepted `1.2.3`, which only failed later at parse time.
 */
import { getCurrency, type CurrencyCode } from './currency-registry';

/** Longest raw entry accepted, chosen to stay inside safe-integer minor units. */
const MAX_WHOLE_DIGITS = 16;

/**
 * Reduces arbitrary keyboard input to a raw money entry for `code`.
 *
 * Enforces one decimal point, the currency's own precision (0 for COP, 3 for
 * BHD), and a single leading sign.
 */
export function sanitizeMoneyEntry(
  value: string,
  code: CurrencyCode,
  options: { allowNegative?: boolean } = {},
): string {
  const { fractionDigits } = getCurrency(code);
  const sign = options.allowNegative === true && value.trimStart().startsWith('-') ? '-' : '';
  const body = value.replace(/-/g, '');
  if (fractionDigits === 0) {
    return `${sign}${body.replace(/\D/g, '').slice(0, MAX_WHOLE_DIGITS)}`;
  }
  let cleaned = body.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot >= 0) {
    const whole = cleaned.slice(0, firstDot).slice(0, MAX_WHOLE_DIGITS);
    const fraction = cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, fractionDigits);
    cleaned = `${whole}.${fraction}`;
  } else {
    cleaned = cleaned.slice(0, MAX_WHOLE_DIGITS);
  }
  return `${sign}${cleaned}`;
}

/** `.` groups thousands where `,` is the decimal mark, and vice versa. */
function groupSeparator(code: CurrencyCode): string {
  return getCurrency(code).decimalSeparator === ',' ? '.' : ',';
}

/**
 * Display form of a raw money entry: thousands grouped, decimals untouched.
 *
 * Grouping is done by regex rather than `toLocaleString` so a 16-digit entry
 * groups exactly instead of going through a lossy `Number`. Empty input returns
 * empty — a field mid-edit must still be able to show its placeholder — and
 * anything not yet a number (a lone `-` or `.`) is returned unchanged so typing
 * never fights the user.
 */
export function formatMoneyEntry(raw: string, code: CurrencyCode): string {
  if (!raw) return '';
  const sign = raw.startsWith('-') ? '-' : '';
  const body = sign ? raw.slice(1) : raw;
  if (!body) return raw;
  const dot = body.indexOf('.');
  const whole = dot >= 0 ? body.slice(0, dot) : body;
  const digits = whole.replace(/^0+(?=\d)/, '');
  if (!/^\d+$/.test(digits)) return raw;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator(code));
  if (dot < 0) return `${sign}${grouped}`;
  return `${sign}${grouped}${getCurrency(code).decimalSeparator}${body.slice(dot + 1)}`;
}
