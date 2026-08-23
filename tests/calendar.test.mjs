import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addCalendarDays,
  buildCalendarMonth,
  calendarMonthLabel,
  monthOf,
  shiftCalendarMonth,
  weekdayLabels,
} from '../src/components/calendar.ts';

test('a month grid is always six full weeks', () => {
  for (const month of ['2026-02', '2026-08', '2027-01', '2024-02']) {
    const weeks = buildCalendarMonth(month);
    assert.equal(weeks.length, 6, `${month} should have six rows`);
    for (const week of weeks) assert.equal(week.length, 7, `${month} rows should have seven cells`);
  }
});

test('every grid row starts on a Sunday and runs consecutively', () => {
  const weeks = buildCalendarMonth('2026-08');
  const flat = weeks.flat();
  assert.equal(weekdayLabels.length, 7);
  for (const week of weeks) {
    const [year, month, day] = week[0].date.split('-').map(Number);
    assert.equal(new Date(Date.UTC(year, month - 1, day)).getUTCDay(), 0, `${week[0].date} is not a Sunday`);
  }
  for (let index = 1; index < flat.length; index += 1) {
    assert.equal(flat[index].date, addCalendarDays(flat[index - 1].date, 1));
  }
});

test('only the target month is flagged as in-month, and every one of its days appears exactly once', () => {
  const weeks = buildCalendarMonth('2026-02');
  const inMonth = weeks.flat().filter((day) => day.inMonth).map((day) => day.date);
  assert.equal(inMonth.length, 28, 'February 2026 has 28 days');
  assert.equal(inMonth[0], '2026-02-01');
  assert.equal(inMonth.at(-1), '2026-02-28');
  assert.equal(new Set(inMonth).size, inMonth.length, 'no day is repeated');
});

test('a leap February is fully covered', () => {
  const inMonth = buildCalendarMonth('2024-02').flat().filter((day) => day.inMonth);
  assert.equal(inMonth.length, 29);
  assert.equal(inMonth.at(-1)?.date, '2024-02-29');
});

test('the grid pads with the adjacent months rather than blanks', () => {
  const weeks = buildCalendarMonth('2026-08');
  // 2026-08-01 is a Saturday, so the first row is 26 Jul – 1 Aug.
  assert.equal(weeks[0][0].date, '2026-07-26');
  assert.equal(weeks[0][0].inMonth, false);
  assert.equal(weeks[0][0].day, 26);
  assert.equal(weeks[0][6].date, '2026-08-01');
  assert.equal(weeks[0][6].inMonth, true);
});

test('month arithmetic rolls the year over in both directions', () => {
  assert.equal(shiftCalendarMonth('2026-12', 1), '2027-01');
  assert.equal(shiftCalendarMonth('2026-01', -1), '2025-12');
  assert.equal(shiftCalendarMonth('2026-08', 0), '2026-08');
  assert.equal(shiftCalendarMonth('2026-08', -14), '2025-06');
});

test('day arithmetic crosses month and year boundaries', () => {
  assert.equal(addCalendarDays('2026-08-31', 1), '2026-09-01');
  assert.equal(addCalendarDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addCalendarDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addCalendarDays('2026-02-28', 1), '2026-03-01');
});

test('month helpers keep the zero-padded contract', () => {
  assert.equal(monthOf('2026-08-23'), '2026-08');
  assert.equal(shiftCalendarMonth('2026-10', -1), '2026-09');
  assert.equal(calendarMonthLabel('2026-08'), 'August 2026');
  assert.equal(calendarMonthLabel('2026-01'), 'January 2026');
});
