import { isValidCalendarDate } from '@/features/transactions/transaction-date';
import type { CreditCardCycle } from './credit-card.types';

type CalendarParts = { year: number; month: number; day: number };

function parseDate(value: string): CalendarParts {
  if (!isValidCalendarDate(value)) throw new Error('A valid Bogotá-local YYYY-MM-DD date is required.');
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInCalendarMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function normalizeMonth(year: number, month: number): { year: number; month: number } {
  const zeroBased = year * 12 + month - 1;
  return {
    year: Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
  };
}

export function calendarDateForIntendedDay(year: number, month: number, intendedDay: number): string {
  if (!Number.isInteger(intendedDay) || intendedDay < 1 || intendedDay > 31) {
    throw new Error('Calendar day must be a whole number from 1 to 31.');
  }
  const normalized = normalizeMonth(year, month);
  const day = Math.min(intendedDay, daysInCalendarMonth(normalized.year, normalized.month));
  return `${String(normalized.year).padStart(4, '0')}-${String(normalized.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function previousMonth(value: string): { year: number; month: number } {
  const { year, month } = parseDate(value);
  return normalizeMonth(year, month - 1);
}

function nextMonth(value: string): { year: number; month: number } {
  const { year, month } = parseDate(value);
  return normalizeMonth(year, month + 1);
}

export function shiftCalendarDate(value: string, amount: number): string {
  if (!Number.isInteger(amount)) throw new Error('Calendar shift must use whole days.');
  let { year, month, day } = parseDate(value);
  let remaining = amount;
  while (remaining > 0) {
    if (day < daysInCalendarMonth(year, month)) day += 1;
    else {
      const next = normalizeMonth(year, month + 1);
      year = next.year;
      month = next.month;
      day = 1;
    }
    remaining -= 1;
  }
  while (remaining < 0) {
    if (day > 1) day -= 1;
    else {
      const previous = normalizeMonth(year, month - 1);
      year = previous.year;
      month = previous.month;
      day = daysInCalendarMonth(year, month);
    }
    remaining += 1;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function dueDateAfterClosing(closingDate: string, paymentDueDay: number): string {
  const closing = parseDate(closingDate);
  let candidate = calendarDateForIntendedDay(closing.year, closing.month, paymentDueDay);
  if (candidate <= closingDate) {
    const next = normalizeMonth(closing.year, closing.month + 1);
    candidate = calendarDateForIntendedDay(next.year, next.month, paymentDueDay);
  }
  return candidate;
}

function daysFromCivil(value: string): number {
  let { year, month, day } = parseDate(value);
  year -= month <= 2 ? 1 : 0;
  const era = Math.floor(year / 400);
  const yearOfEra = year - era * 400;
  const shiftedMonth = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra;
}

export function calendarDaysBetween(from: string, to: string): number {
  return daysFromCivil(to) - daysFromCivil(from);
}

export class CreditCardCycleService {
  resolve(statementClosingDay: number, paymentDueDay: number, today: string): CreditCardCycle {
    const current = parseDate(today);
    const currentMonthClosing = calendarDateForIntendedDay(current.year, current.month, statementClosingDay);
    const previousClosingDate = today >= currentMonthClosing
      ? currentMonthClosing
      : (() => {
          const previous = normalizeMonth(current.year, current.month - 1);
          return calendarDateForIntendedDay(previous.year, previous.month, statementClosingDay);
        })();
    const following = nextMonth(previousClosingDate);
    const nextClosingDate = calendarDateForIntendedDay(following.year, following.month, statementClosingDay);
    const prior = previousMonth(previousClosingDate);
    const priorClosingDate = calendarDateForIntendedDay(prior.year, prior.month, statementClosingDay);
    const previousDue = dueDateAfterClosing(previousClosingDate, paymentDueDay);
    const nextDueDate = previousDue >= today
      ? previousDue
      : dueDateAfterClosing(nextClosingDate, paymentDueDay);
    return {
      previousClosingDate,
      nextClosingDate,
      currentPeriodStart: shiftCalendarDate(priorClosingDate, 1),
      currentPeriodEnd: previousClosingDate,
      nextDueDate,
    };
  }
}
