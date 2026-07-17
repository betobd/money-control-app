import assert from 'node:assert/strict';
import test from 'node:test';

import { bogotaToday } from '../src/features/transactions/transaction-date.ts';
import {
  enumerateReportBuckets,
  previousEquivalentPeriod,
  ReportPeriodValidationError,
  resolveReportPeriod,
} from '../src/features/reports/report-period.ts';
import {
  buildComparisonMetric,
  calculateBasisPoints,
  normalizeSummary,
  ReportService,
} from '../src/features/reports/report.service.ts';

const TODAY = '2026-07-16';

test('resolves current and previous calendar month boundaries', () => {
  assert.deepEqual(
    resolveReportPeriod({ preset: 'current-month' }, TODAY),
    {
      preset: 'current-month',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
      grouping: 'day',
      label: 'Jul 1, 2026 – Jul 31, 2026',
    },
  );
  const previous = resolveReportPeriod({ preset: 'previous-month' }, TODAY);
  assert.equal(previous.dateFrom, '2026-06-01');
  assert.equal(previous.dateTo, '2026-06-30');
});

test('resolves rolling calendar-month windows and current year', () => {
  const threeMonths = resolveReportPeriod({ preset: 'last-3-months' }, TODAY);
  assert.equal(threeMonths.dateFrom, '2026-05-01');
  assert.equal(threeMonths.dateTo, '2026-07-31');
  assert.equal(threeMonths.grouping, 'month');

  const sixMonths = resolveReportPeriod({ preset: 'last-6-months' }, '2026-01-05');
  assert.equal(sixMonths.dateFrom, '2025-08-01');
  assert.equal(sixMonths.dateTo, '2026-01-31');

  const year = resolveReportPeriod({ preset: 'current-year' }, TODAY);
  assert.equal(year.dateFrom, '2026-01-01');
  assert.equal(year.dateTo, '2026-12-31');
  assert.equal(year.grouping, 'month');
});

test('validates inclusive custom ranges and rejects reversed ranges', () => {
  assert.throws(
    () => resolveReportPeriod({
      preset: 'custom',
      customDateFrom: '2026-02-29',
      customDateTo: '2026-03-01',
    }, TODAY),
    ReportPeriodValidationError,
  );
});

test('accepts a valid inclusive custom range and chooses daily grouping', () => {
  const period = resolveReportPeriod({
    preset: 'custom',
    customDateFrom: '2026-02-28',
    customDateTo: '2026-03-01',
  }, TODAY);
  assert.equal(period.dateFrom, '2026-02-28');
  assert.equal(period.dateTo, '2026-03-01');
  assert.equal(period.grouping, 'day');
  assert.equal(enumerateReportBuckets(period).length, 2);
  assert.throws(
    () => resolveReportPeriod({ preset: 'custom', customDateFrom: '2026-07-20', customDateTo: '2026-07-19' }, TODAY),
    ReportPeriodValidationError,
  );
});

test('uses Bogotá local calendar date around the UTC day boundary', () => {
  const localDate = bogotaToday(new Date('2026-07-17T03:30:00.000Z'));
  assert.equal(localDate, '2026-07-16');
  assert.equal(resolveReportPeriod({ preset: 'current-month' }, localDate).dateFrom, '2026-07-01');
});

test('builds previous equivalent calendar and custom periods', () => {
  const currentMonth = resolveReportPeriod({ preset: 'current-month' }, '2026-03-15');
  const previousMonth = previousEquivalentPeriod(currentMonth);
  assert.equal(previousMonth.dateFrom, '2026-02-01');
  assert.equal(previousMonth.dateTo, '2026-02-28');

  const custom = resolveReportPeriod({
    preset: 'custom',
    customDateFrom: '2026-07-01',
    customDateTo: '2026-07-20',
  }, TODAY);
  const preceding = previousEquivalentPeriod(custom);
  assert.equal(preceding.dateFrom, '2026-06-11');
  assert.equal(preceding.dateTo, '2026-06-30');
});

test('normalizes summary calculations and handles an empty period', () => {
  const largestExpense = {
    amount: 80_000,
    categoryName: 'Food',
    accountName: 'Checking',
    transactionDate: '2026-07-10',
  };
  assert.deepEqual(normalizeSummary({
    income: 300_000,
    expenses: 100_001,
    incomeCount: 2,
    expenseCount: 2,
    largestExpense,
  }), {
    income: 300_000,
    expenses: 100_001,
    net: 199_999,
    incomeCount: 2,
    expenseCount: 2,
    averageExpense: 50_001,
    largestExpense,
  });
  assert.deepEqual(normalizeSummary({
    income: 0,
    expenses: 0,
    incomeCount: 0,
    expenseCount: 0,
    largestExpense: null,
  }), {
    income: 0,
    expenses: 0,
    net: 0,
    incomeCount: 0,
    expenseCount: 0,
    averageExpense: 0,
    largestExpense: null,
  });
});

test('calculates integer basis points without NaN or Infinity', () => {
  assert.equal(calculateBasisPoints(1, 3), 3333);
  assert.equal(calculateBasisPoints(-1, 3), -3333);
  assert.equal(calculateBasisPoints(10, 0), 0);
  const noBaseline = buildComparisonMetric(100, 0, true, false);
  assert.equal(noBaseline.percentageChangeBasisPoints, null);
  assert.equal(noBaseline.hasPreviousData, false);
  assert.equal(noBaseline.tone, 'neutral');
});

class FakeReportRepository {
  summaries = new Map();
  cashFlowRows = [];
  categories = [];
  netWorthResult = { startingNetWorth: 0, changes: [] };

  async summarize(period) {
    return this.summaries.get(period.dateFrom) ?? {
      income: 0,
      expenses: 0,
      incomeCount: 0,
      expenseCount: 0,
      largestExpense: null,
    };
  }
  async cashFlow() { return this.cashFlowRows; }
  async categoryExpenses() { return this.categories; }
  async netWorth() { return this.netWorthResult; }
}

test('fills missing cash-flow buckets chronologically and excludes absent data', async () => {
  const repository = new FakeReportRepository();
  repository.cashFlowRows = [
    { key: '2026-07-03', income: 50_000, expenses: 0 },
    { key: '2026-07-01', income: 0, expenses: 10_000 },
  ];
  const service = new ReportService(repository);
  const data = await service.load({
    preset: 'custom',
    customDateFrom: '2026-07-01',
    customDateTo: '2026-07-03',
  }, TODAY);
  assert.deepEqual(data.cashFlow.map((bucket) => bucket.key), [
    '2026-07-01', '2026-07-02', '2026-07-03',
  ]);
  assert.deepEqual(data.cashFlow[1], {
    key: '2026-07-02',
    label: 'Jul 2',
    dateFrom: '2026-07-02',
    dateTo: '2026-07-02',
    income: 0,
    expenses: 0,
    net: 0,
  });
});

test('normalizes category percentages, archived/unknown rows, and zero totals', async () => {
  const repository = new FakeReportRepository();
  repository.categories = [
    { categoryId: 'archived', categoryName: 'Old utilities', icon: 'bills', total: 300, transactionCount: 2 },
    { categoryId: 'unknown-category', categoryName: 'Unknown category', icon: 'other', total: 100, transactionCount: 1 },
  ];
  const service = new ReportService(repository);
  const data = await service.load({ preset: 'current-month' }, TODAY);
  assert.deepEqual(data.categoryExpenses.map((category) => category.percentageBasisPoints), [7500, 2500]);
  assert.equal(data.categoryExpenses[0].categoryName, 'Old utilities');
  repository.categories = [];
  assert.deepEqual((await service.load({ preset: 'current-month' }, TODAY)).categoryExpenses, []);
});

test('builds net worth from a starting balance and period changes, including zero buckets', async () => {
  const repository = new FakeReportRepository();
  repository.netWorthResult = {
    startingNetWorth: 800_000,
    changes: [
      { key: '2026-07-01', amount: 500_000 },
      { key: '2026-07-03', amount: -200_000 },
    ],
  };
  const data = await new ReportService(repository).load({
    preset: 'custom',
    customDateFrom: '2026-07-01',
    customDateTo: '2026-07-03',
  }, TODAY);
  assert.deepEqual(data.netWorth.map((point) => point.netWorth), [800_000, 1_300_000, 1_300_000, 1_100_000]);
  assert.equal(data.netWorth[0].date, '2026-06-30');
  assert.equal(data.netWorth[0].isStartingPoint, true);
});

test('uses month-end net-worth points for long periods', async () => {
  const repository = new FakeReportRepository();
  repository.netWorthResult = {
    startingNetWorth: 1_000_000,
    changes: [{ key: '2026-06', amount: -50_000 }],
  };
  const data = await new ReportService(repository).load({ preset: 'last-3-months' }, TODAY);
  assert.deepEqual(data.netWorth.map((point) => point.date), [
    '2026-04-30', '2026-05-31', '2026-06-30', '2026-07-31',
  ]);
  assert.deepEqual(data.netWorth.map((point) => point.netWorth), [
    1_000_000, 1_000_000, 950_000, 950_000,
  ]);
});

test('compares income, expenses, net, average, and count with metric-aware semantics', async () => {
  const repository = new FakeReportRepository();
  repository.summaries.set('2026-07-01', {
    income: 300,
    expenses: 240,
    incomeCount: 1,
    expenseCount: 3,
    largestExpense: null,
  });
  repository.summaries.set('2026-06-01', {
    income: 200,
    expenses: 120,
    incomeCount: 1,
    expenseCount: 2,
    largestExpense: null,
  });
  const comparison = (await new ReportService(repository).load({ preset: 'current-month' }, TODAY)).comparison;
  assert.equal(comparison.income.difference, 100);
  assert.equal(comparison.income.percentageChangeBasisPoints, 5000);
  assert.equal(comparison.income.tone, 'positive');
  assert.equal(comparison.expenses.difference, 120);
  assert.equal(comparison.expenses.tone, 'negative');
  assert.equal(comparison.net.difference, -20);
  assert.equal(comparison.net.tone, 'negative');
  assert.equal(comparison.averageExpense.current, 80);
  assert.equal(comparison.averageExpense.previous, 60);
  assert.equal(comparison.averageExpense.tone, 'negative');
  assert.equal(comparison.expenseCount.tone, 'negative');
});
