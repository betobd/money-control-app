import type { TransactionDateRangePreset } from './transaction.types';

export type TransactionDateRange = {
  dateFrom?: string;
  dateTo?: string;
};

export class TransactionDateRangeError extends Error {}

export function bogotaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
export function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); if (!match) return false;
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]); const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
export function monthFromDate(value: string): string { return value.slice(0, 7); }
export function formatTransactionDate(value: string): string { const [year, month, day] = value.split('-').map(Number); return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day))); }

export function resolveTransactionDateRange(
  preset: TransactionDateRangePreset,
  today = bogotaToday(),
  customDateFrom = '',
  customDateTo = '',
): TransactionDateRange {
  if (!isValidCalendarDate(today)) {
    throw new TransactionDateRangeError('Unable to determine a valid Bogotá-local date.');
  }
  if (preset === 'all-time') return {};
  if (preset === 'custom') {
    if (!isValidCalendarDate(customDateFrom) || !isValidCalendarDate(customDateTo)) {
      throw new TransactionDateRangeError('Enter valid start and end dates in YYYY-MM-DD format.');
    }
    if (customDateTo < customDateFrom) {
      throw new TransactionDateRangeError('End date cannot be earlier than start date.');
    }
    return { dateFrom: customDateFrom, dateTo: customDateTo };
  }

  const [year, month] = today.split('-').map(Number);
  if (preset === 'last-30-days') {
    return { dateFrom: shiftCalendarDate(today, -29), dateTo: today };
  }

  const monthOffset = preset === 'previous-month' ? -1 : 0;
  const start = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return { dateFrom: formatCalendarDate(start), dateTo: formatCalendarDate(end) };
}

export function formatTransactionDateRange(range: TransactionDateRange): string {
  if (!range.dateFrom && !range.dateTo) return 'All time';
  if (range.dateFrom === range.dateTo && range.dateFrom) return formatTransactionDate(range.dateFrom);
  return `${range.dateFrom ? formatTransactionDate(range.dateFrom) : 'Beginning'} – ${range.dateTo ? formatTransactionDate(range.dateTo) : 'Today'}`;
}

function shiftCalendarDate(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return formatCalendarDate(date);
}

function formatCalendarDate(value: Date): string {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, '0'),
    String(value.getUTCDate()).padStart(2, '0'),
  ].join('-');
}
