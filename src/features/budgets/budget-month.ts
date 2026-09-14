import { bogotaToday, monthFromDate } from '@/features/transactions/transaction-date';
import { getIntlLocale } from '@/i18n/messages';

export function isValidBudgetMonth(value: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

export function shiftBudgetMonth(value: string, offset: number): string {
  if (!isValidBudgetMonth(value) || !Number.isInteger(offset)) return value;
  const [year, month] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function nextBudgetMonth(value: string): string {
  return shiftBudgetMonth(value, 1);
}

/**
 * `2026-09` -> `September 2026`, in the interface language. Month names stay
 * lowercase where the language writes them so (`septiembre de 2026`), which is
 * what a sentence needs; use {@link budgetMonthTitle} where the month stands alone.
 *
 * Components pass the locale from `useLanguage()` so a language change is not
 * hidden behind a memoized value.
 */
export function budgetMonthLabel(value: string, locale: string = getIntlLocale()): string {
  if (!isValidBudgetMonth(value)) return value;
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}-01T00:00:00Z`));
}

/** The month as a standalone label (a selector, a heading): first letter capitalized. */
export function budgetMonthTitle(value: string, locale: string = getIntlLocale()): string {
  const label = budgetMonthLabel(value, locale);
  return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
}

export function currentBudgetMonth(now = new Date()): string {
  return monthFromDate(bogotaToday(now));
}
