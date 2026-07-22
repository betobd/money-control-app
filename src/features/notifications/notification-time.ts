import { isValidTime } from './notification.types';

export function splitTime(value: string): { hour: number; minute: number } {
  if (!isValidTime(value)) throw new Error('Notification time must use HH:mm.');
  const [hour, minute] = value.split(':').map(Number);
  return { hour, minute };
}

export function shiftCalendarDate(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function deviceLocalDateTime(calendarDate: string, time: string): Date {
  const [year, month, day] = calendarDate.split('-').map(Number);
  const { hour, minute } = splitTime(time);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'device-local';
}
