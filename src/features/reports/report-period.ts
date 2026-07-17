import { bogotaToday, isValidCalendarDate } from '@/features/transactions/transaction-date';
import type {
  ReportGrouping,
  ReportPeriod,
  ReportPeriodPreset,
  ReportPeriodSelection,
} from './report.types';

const DAILY_RANGE_LIMIT = 45;

export class ReportPeriodValidationError extends Error {}

export function resolveReportPeriod(
  selection: ReportPeriodSelection,
  today = bogotaToday(),
): ReportPeriod {
  if (!isValidCalendarDate(today)) {
    throw new ReportPeriodValidationError('Unable to determine a valid Bogotá-local date.');
  }

  if (selection.preset === 'custom') {
    const dateFrom = selection.customDateFrom?.trim() ?? '';
    const dateTo = selection.customDateTo?.trim() ?? '';
    validateCustomRange(dateFrom, dateTo);
    return createPeriod('custom', dateFrom, dateTo);
  }

  const monthStart = `${today.slice(0, 7)}-01`;
  let dateFrom: string;
  let dateTo: string;

  switch (selection.preset) {
    case 'current-month':
      dateFrom = monthStart;
      dateTo = endOfMonth(monthStart);
      break;
    case 'previous-month':
      dateFrom = shiftMonths(monthStart, -1);
      dateTo = endOfMonth(dateFrom);
      break;
    case 'last-3-months':
      dateFrom = shiftMonths(monthStart, -2);
      dateTo = endOfMonth(monthStart);
      break;
    case 'last-6-months':
      dateFrom = shiftMonths(monthStart, -5);
      dateTo = endOfMonth(monthStart);
      break;
    case 'current-year':
      dateFrom = `${today.slice(0, 4)}-01-01`;
      dateTo = `${today.slice(0, 4)}-12-31`;
      break;
  }

  return createPeriod(selection.preset, dateFrom, dateTo);
}

export function previousEquivalentPeriod(period: ReportPeriod): ReportPeriod {
  if (period.preset === 'custom') {
    const length = inclusiveDayCount(period.dateFrom, period.dateTo);
    const dateTo = shiftDays(period.dateFrom, -1);
    return createPeriod('custom', shiftDays(dateTo, -(length - 1)), dateTo);
  }

  if (period.preset === 'current-year') {
    const year = Number(period.dateFrom.slice(0, 4)) - 1;
    return createPeriod('current-year', `${year}-01-01`, `${year}-12-31`);
  }

  const monthCount = period.preset === 'last-3-months'
    ? 3
    : period.preset === 'last-6-months'
      ? 6
      : 1;
  const dateTo = shiftDays(period.dateFrom, -1);
  const dateFrom = shiftMonths(`${dateTo.slice(0, 7)}-01`, -(monthCount - 1));
  return createPeriod(period.preset, dateFrom, dateTo);
}

export function enumerateReportBuckets(period: ReportPeriod): Omit<
  import('./report.types').CashFlowBucket,
  'income' | 'expenses' | 'net'
>[] {
  if (period.grouping === 'day') {
    const buckets = [];
    for (let date = period.dateFrom; date <= period.dateTo; date = shiftDays(date, 1)) {
      buckets.push({
        key: date,
        label: formatDate(date, { month: 'short', day: 'numeric' }),
        dateFrom: date,
        dateTo: date,
      });
    }
    return buckets;
  }

  const buckets = [];
  for (
    let month = `${period.dateFrom.slice(0, 7)}-01`;
    month <= period.dateTo;
    month = shiftMonths(month, 1)
  ) {
    const monthEnd = endOfMonth(month);
    buckets.push({
      key: month.slice(0, 7),
      label: formatDate(month, { month: 'short', year: 'numeric' }),
      dateFrom: month < period.dateFrom ? period.dateFrom : month,
      dateTo: monthEnd > period.dateTo ? period.dateTo : monthEnd,
    });
  }
  return buckets;
}

export function dayBefore(value: string): string {
  return shiftDays(value, -1);
}

export function formatReportDate(value: string): string {
  return formatDate(value, { month: 'short', day: 'numeric', year: 'numeric' });
}

function createPeriod(
  preset: ReportPeriodPreset,
  dateFrom: string,
  dateTo: string,
): ReportPeriod {
  const grouping: ReportGrouping = inclusiveDayCount(dateFrom, dateTo) <= DAILY_RANGE_LIMIT
    ? 'day'
    : 'month';
  return {
    preset,
    dateFrom,
    dateTo,
    grouping,
    label: `${formatReportDate(dateFrom)} – ${formatReportDate(dateTo)}`,
  };
}

function validateCustomRange(dateFrom: string, dateTo: string): void {
  if (!isValidCalendarDate(dateFrom) || !isValidCalendarDate(dateTo)) {
    throw new ReportPeriodValidationError('Enter valid start and end dates in YYYY-MM-DD format.');
  }
  if (dateTo < dateFrom) {
    throw new ReportPeriodValidationError('End date cannot be earlier than start date.');
  }
}

function inclusiveDayCount(dateFrom: string, dateTo: string): number {
  return Math.round((toUtcDate(dateTo).getTime() - toUtcDate(dateFrom).getTime()) / 86_400_000) + 1;
}

function shiftDays(value: string, amount: number): string {
  const date = toUtcDate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatCalendarDate(date);
}

function shiftMonths(value: string, amount: number): string {
  const date = toUtcDate(value);
  return formatCalendarDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1)));
}

function endOfMonth(value: string): string {
  const date = toUtcDate(value);
  return formatCalendarDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
}

function toUtcDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatCalendarDate(value: Date): string {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, '0'),
    String(value.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function formatDate(
  value: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(toUtcDate(value));
}
