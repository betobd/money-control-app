import { getIntlLocale } from '@/i18n/messages';

/**
 * Pure calendar-grid math for the shared date picker.
 *
 * Every value is a Bogotá-local `YYYY-MM-DD` calendar string (or `YYYY-MM` for a
 * month). Arithmetic goes through `Date.UTC` so it never shifts across a
 * timezone boundary — the same rule the transaction date module follows.
 *
 * The week starts on Sunday, matching CLDR's first day for `es-CO`.
 */

export type CalendarDay = {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Day of month, 1-31. */
  day: number;
  /** False for the leading/trailing days borrowed from the adjacent months. */
  inMonth: boolean;
};

/**
 * Narrow English weekday headers, Sunday first. The picker renders the localized
 * `common.date.weekdaysNarrow`; this stays as the grid's column contract.
 */
export const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/** `2026-08-23` -> `2026-08`. */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** Offsets a month string by whole months, rolling the year over. */
export function shiftCalendarMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}`;
}

/** Offsets a calendar date by whole days. */
export function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return formatDate(new Date(Date.UTC(year, month - 1, day + days)));
}

/** `2026-08` -> `August 2026` (in the active interface language). */
export function calendarMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(getIntlLocale(), { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

/**
 * Builds the six-week grid for a month, padded with the adjacent months' days so
 * every row has seven cells and the grid height never jumps between months.
 */
export function buildCalendarMonth(month: string): CalendarDay[][] {
  const [year, monthNumber] = month.split('-').map(Number);
  const firstOfMonth = new Date(Date.UTC(year, monthNumber - 1, 1));
  // Back up to the Sunday on or before the 1st.
  const gridStart = new Date(Date.UTC(year, monthNumber - 1, 1 - firstOfMonth.getUTCDay()));

  const weeks: CalendarDay[][] = [];
  for (let week = 0; week < 6; week += 1) {
    const days: CalendarDay[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const cursor = new Date(Date.UTC(
        gridStart.getUTCFullYear(),
        gridStart.getUTCMonth(),
        gridStart.getUTCDate() + week * 7 + weekday,
      ));
      days.push({
        date: formatDate(cursor),
        day: cursor.getUTCDate(),
        inMonth: cursor.getUTCMonth() === monthNumber - 1 && cursor.getUTCFullYear() === year,
      });
    }
    weeks.push(days);
  }
  return weeks;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDate(value: Date): string {
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
}
