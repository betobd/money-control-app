import assert from 'node:assert/strict';
import test from 'node:test';

import {
  budgetPerformance,
  cumulativePace,
  foldCategoryExpenses,
  monthsBetween,
  savingsRateBasisPoints,
  weekdaySpending,
} from '../src/features/reports/report-insights.ts';

function bucket(date, { income = 0, expenses = 0 } = {}) {
  return {
    key: date,
    label: date,
    dateFrom: date,
    dateTo: date,
    income,
    grossExpenses: expenses,
    refunds: 0,
    expenses,
    net: income - expenses,
  };
}

/* -------------------------------------------------------------- savings rate */

test('savings rate is the net share of income in basis points', () => {
  assert.equal(savingsRateBasisPoints(1_000_000, 250_000), 2500);
  assert.equal(savingsRateBasisPoints(1_000_000, 1_000_000), 10000);
});

test('a negative net produces a negative savings rate', () => {
  assert.equal(savingsRateBasisPoints(1_000_000, -500_000), -5000);
});

test('savings rate is undefined without income, never zero', () => {
  assert.equal(savingsRateBasisPoints(0, 0), null);
  assert.equal(savingsRateBasisPoints(0, -400_000), null);
  assert.equal(savingsRateBasisPoints(-10, 5), null);
});

/* ------------------------------------------------------------------ weekday */

test('weekday spending always returns all seven days, Sunday first', () => {
  const result = weekdaySpending([]);
  assert.equal(result.length, 7);
  assert.deepEqual(result.map((entry) => entry.label), ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  assert.ok(result.every((entry) => entry.total === 0 && entry.average === 0 && entry.dayCount === 0));
});

test('weekday spending totals by day of week', () => {
  // 2026-08-03 is a Monday; 2026-08-10 is the following Monday.
  const result = weekdaySpending([
    bucket('2026-08-03', { expenses: 10_000 }),
    bucket('2026-08-10', { expenses: 30_000 }),
    bucket('2026-08-07', { expenses: 50_000 }),
  ]);
  const monday = result.find((entry) => entry.label === 'Mon');
  const friday = result.find((entry) => entry.label === 'Fri');
  assert.equal(monday.total, 40_000);
  assert.equal(monday.dayCount, 2);
  assert.equal(monday.average, 20_000, 'averages over the Mondays that occurred');
  assert.equal(friday.total, 50_000);
  assert.equal(friday.average, 50_000);
});

test('weekday averages divide by occurrences so uneven periods stay comparable', () => {
  const result = weekdaySpending([
    bucket('2026-08-03', { expenses: 30_000 }),
    bucket('2026-08-10', { expenses: 0 }),
    bucket('2026-08-17', { expenses: 0 }),
    bucket('2026-08-07', { expenses: 20_000 }),
  ]);
  assert.equal(result.find((entry) => entry.label === 'Mon').average, 10_000);
  assert.equal(result.find((entry) => entry.label === 'Fri').average, 20_000);
});

/* --------------------------------------------------------------------- pace */

test('pace accumulates net expenses through the period', () => {
  const pace = cumulativePace(
    [
      bucket('2026-08-01', { expenses: 10_000 }),
      bucket('2026-08-02', { expenses: 5_000 }),
      bucket('2026-08-03', { expenses: 0 }),
    ],
    [],
  );
  assert.deepEqual(pace.map((point) => point.current), [10_000, 15_000, 15_000]);
  assert.ok(pace.every((point) => point.previous === null));
});

test('pace aligns the previous period by position and ends early when it is shorter', () => {
  const pace = cumulativePace(
    [
      bucket('2026-08-01', { expenses: 10_000 }),
      bucket('2026-08-02', { expenses: 10_000 }),
      bucket('2026-08-03', { expenses: 10_000 }),
    ],
    [
      bucket('2026-07-01', { expenses: 40_000 }),
      bucket('2026-07-02', { expenses: 40_000 }),
    ],
  );
  assert.deepEqual(pace.map((point) => point.previous), [40_000, 80_000, null]);
  assert.equal(pace[2].current, 30_000);
});

test('an empty period produces no pace points', () => {
  assert.deepEqual(cumulativePace([], []), []);
});

/* ------------------------------------------------------------------ budgets */

const limit = (categoryId, limitAmount, monthCount = 1) => ({
  categoryId,
  categoryName: categoryId,
  icon: 'cart',
  limitAmount,
  monthCount,
});
const spent = (categoryId, total) => ({
  categoryId,
  categoryName: categoryId,
  icon: 'cart',
  total,
  percentageBasisPoints: 0,
  transactionCount: 1,
});

test('budget performance pairs limits with actual spending', () => {
  const [result] = budgetPerformance([limit('food', 100_000)], [spent('food', 40_000)]);
  assert.equal(result.limit, 100_000);
  assert.equal(result.spent, 40_000);
  assert.equal(result.remaining, 60_000);
  assert.equal(result.percentageUsed, 40);
  assert.equal(result.status, 'under');
});

test('a budget with no spending is kept and reads as fully remaining', () => {
  const [result] = budgetPerformance([limit('food', 100_000)], []);
  assert.equal(result.spent, 0);
  assert.equal(result.remaining, 100_000);
  assert.equal(result.percentageUsed, 0);
  assert.equal(result.status, 'under');
});

test('budget status crosses to near at 80% and over past the limit', () => {
  const [near] = budgetPerformance([limit('food', 100_000)], [spent('food', 80_000)]);
  assert.equal(near.status, 'near');
  const [over] = budgetPerformance([limit('food', 100_000)], [spent('food', 100_001)]);
  assert.equal(over.status, 'over');
  assert.equal(over.remaining, -1);
  const [exact] = budgetPerformance([limit('food', 100_000)], [spent('food', 100_000)]);
  assert.equal(exact.status, 'near', 'spending exactly the limit is not yet over');
});

test('spending without a budget is not reported as a budget', () => {
  assert.deepEqual(budgetPerformance([], [spent('food', 50_000)]), []);
});

test('budgets are ranked by how used they are', () => {
  const result = budgetPerformance(
    [limit('food', 100_000), limit('rent', 100_000), limit('fun', 100_000)],
    [spent('food', 10_000), spent('rent', 90_000), spent('fun', 50_000)],
  );
  assert.deepEqual(result.map((entry) => entry.categoryId), ['rent', 'fun', 'food']);
});

/* ------------------------------------------------------------ month spanning */

test('a period inside one month covers exactly that month', () => {
  assert.deepEqual(monthsBetween('2026-08-01', '2026-08-31'), ['2026-08']);
  assert.deepEqual(monthsBetween('2026-08-10', '2026-08-12'), ['2026-08']);
});

test('a period spanning months lists each one, rolling the year over', () => {
  assert.deepEqual(monthsBetween('2026-06-15', '2026-08-14'), ['2026-06', '2026-07', '2026-08']);
  assert.deepEqual(monthsBetween('2026-11-20', '2027-02-03'), ['2026-11', '2026-12', '2027-01', '2027-02']);
});

/* -------------------------------------------- category and subcategory folding */

function leaf(categoryId, subcategoryId, total, transactionCount = 1) {
  return {
    categoryId,
    categoryName: categoryId,
    icon: 'other',
    subcategoryId,
    subcategoryName: subcategoryId,
    total,
    transactionCount,
  };
}

test('a category total is the sum of its subcategories plus its own spending', () => {
  const [hogar] = foldCategoryExpenses([
    leaf('hogar', 'mercado', 60_000, 3),
    leaf('hogar', null, 40_000, 2),
  ]);
  assert.equal(hogar.total, 100_000);
  assert.equal(hogar.transactionCount, 5);
  assert.equal(hogar.subcategories.reduce((sum, item) => sum + item.total, 0), hogar.total);
});

test('subcategory shares are relative to the parent, category shares to all expenses', () => {
  const [hogar] = foldCategoryExpenses([
    leaf('hogar', 'mercado', 75_000),
    leaf('hogar', null, 25_000),
  ]);
  assert.equal(hogar.percentageBasisPoints, 10_000);
  assert.deepEqual(hogar.subcategories.map((item) => item.percentageBasisPoints), [7500, 2500]);
});

test('a category with no subcategorised spending gets no breakdown', () => {
  const [plain] = foldCategoryExpenses([leaf('salud', null, 10_000)]);
  assert.deepEqual(plain.subcategories, []);
});

test('a category whose spending is entirely one subcategory still gets a breakdown', () => {
  const [transporte] = foldCategoryExpenses([leaf('transporte', 'taxi', 10_000)]);
  assert.deepEqual(transporte.subcategories.map((item) => item.name), ['taxi']);
  assert.equal(transporte.subcategories[0].percentageBasisPoints, 10_000);
});

test('breakdown rows are ranked by amount, with the unclassified bucket named', () => {
  const [hogar] = foldCategoryExpenses([
    leaf('hogar', null, 20_000),
    leaf('hogar', 'servicios', 10_000),
    leaf('hogar', 'mercado', 50_000),
  ]);
  assert.deepEqual(hogar.subcategories.map((item) => item.name), [
    'mercado', 'No subcategory', 'servicios',
  ]);
});

test('categories are ranked by total, unchanged by how they split internally', () => {
  const folded = foldCategoryExpenses([
    leaf('transporte', 'taxi', 90_000),
    leaf('hogar', 'mercado', 50_000),
    leaf('hogar', null, 50_000),
  ]);
  assert.deepEqual(folded.map((category) => category.categoryId), ['hogar', 'transporte']);
  assert.deepEqual(folded.map((category) => category.total), [100_000, 90_000]);
});

test('a refund that cancels a subcategory leaves a zero row, not a missing one', () => {
  const [hogar] = foldCategoryExpenses([
    leaf('hogar', 'mercado', 0, 2),
    leaf('hogar', null, 30_000, 1),
  ]);
  assert.equal(hogar.total, 30_000);
  const mercado = hogar.subcategories.find((item) => item.subcategoryId === 'mercado');
  assert.equal(mercado.total, 0);
  assert.equal(mercado.transactionCount, 2);
});

test('folding an empty result yields no categories', () => {
  assert.deepEqual(foldCategoryExpenses([]), []);
});
