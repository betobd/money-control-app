import { isValidCalendarDate } from '@/features/transactions/transaction-date';
import type { RecurringFrequency, RecurringRuleRecord } from './recurring-transaction.types';

type ScheduleDefinition = Pick<
  RecurringRuleRecord,
  'frequency' | 'interval' | 'startDate' | 'nextOccurrenceDate' | 'endDate'
>;

export function nextScheduledDate(
  current: string,
  startDate: string,
  frequency: RecurringFrequency,
  interval: number,
): string {
  assertScheduleDate(current);
  assertScheduleDate(startDate);
  if (!Number.isInteger(interval) || interval < 1) throw new Error('Recurrence interval must be positive.');

  if (frequency === 'daily') return shiftDays(current, interval);
  if (frequency === 'weekly') return shiftDays(current, interval * 7);

  const [currentYear, currentMonth] = current.split('-').map(Number);
  const anchorDay = Number(startDate.slice(8, 10));
  if (frequency === 'monthly') {
    const target = new Date(Date.UTC(currentYear, currentMonth - 1 + interval, 1));
    return dateWithClampedDay(target.getUTCFullYear(), target.getUTCMonth() + 1, anchorDay);
  }

  return dateWithClampedDay(
    currentYear + interval,
    Number(startDate.slice(5, 7)),
    anchorDay,
  );
}

export function collectDueDates(
  rule: ScheduleDefinition,
  throughDate: string,
  limit: number,
): { dates: string[]; nextDate: string; limited: boolean } {
  assertScheduleDate(throughDate);
  if (!Number.isInteger(limit) || limit < 1) throw new Error('Generation limit must be positive.');

  const dates: string[] = [];
  let cursor = rule.nextOccurrenceDate;
  while (cursor <= throughDate && (!rule.endDate || cursor <= rule.endDate) && dates.length < limit) {
    dates.push(cursor);
    cursor = nextScheduledDate(cursor, rule.startDate, rule.frequency, rule.interval);
  }
  const limited = dates.length === limit
    && cursor <= throughDate
    && (!rule.endDate || cursor <= rule.endDate);
  return { dates, nextDate: cursor, limited };
}

export function firstScheduledOnOrAfter(
  startDate: string,
  targetDate: string,
  frequency: RecurringFrequency,
  interval: number,
): string {
  assertScheduleDate(startDate);
  assertScheduleDate(targetDate);
  let cursor = startDate;
  while (cursor < targetDate) {
    cursor = nextScheduledDate(cursor, startDate, frequency, interval);
  }
  return cursor;
}

function shiftDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  return formatDate(new Date(Date.UTC(year, month - 1, day + days)));
}

function dateWithClampedDay(year: number, month: number, desiredDay: number): string {
  const finalDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return [
    year,
    String(month).padStart(2, '0'),
    String(Math.min(desiredDay, finalDay)).padStart(2, '0'),
  ].join('-');
}

function formatDate(value: Date): string {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, '0'),
    String(value.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function assertScheduleDate(value: string): void {
  if (!isValidCalendarDate(value)) throw new Error(`Invalid recurring calendar date: ${value}`);
}
