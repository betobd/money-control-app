import {
  dayBefore,
  enumerateReportBuckets,
  previousEquivalentPeriod,
  resolveReportPeriod,
} from './report-period';
import type { ReportRepository } from './report.repository';
import type {
  CashFlowBucket,
  CategoryExpenseSummary,
  ComparisonDirection,
  ComparisonMetric,
  ComparisonTone,
  NetWorthPoint,
  PeriodSummary,
  PreviousPeriodComparison,
  ReportData,
  ReportPeriod,
  ReportPeriodSelection,
  ReportSummaryAggregate,
} from './report.types';

function safeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} exceeds the supported safe integer range.`);
  }
  return value;
}

function roundedIntegerDivision(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  const result = (BigInt(numerator) + BigInt(Math.floor(denominator / 2))) / BigInt(denominator);
  return safeInteger(Number(result), 'Rounded report value');
}

export function calculateBasisPoints(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  const numeratorValue = BigInt(numerator);
  const denominatorValue = BigInt(Math.abs(denominator));
  const sign = numeratorValue < 0n ? -1n : 1n;
  const absoluteNumerator = numeratorValue < 0n ? -numeratorValue : numeratorValue;
  const rounded = (absoluteNumerator * 10_000n + denominatorValue / 2n) / denominatorValue;
  return safeInteger(Number(rounded * sign), 'Percentage change');
}

export function normalizeSummary(aggregate: ReportSummaryAggregate): PeriodSummary {
  const net = safeInteger(aggregate.income - aggregate.expenses, 'Report net result');
  return {
    ...aggregate,
    net,
    averageExpense: roundedIntegerDivision(aggregate.expenses, aggregate.expenseCount),
  };
}

export function buildComparisonMetric(
  current: number,
  previous: number,
  higherIsBetter: boolean,
  previousPeriodHasTransactions: boolean,
): ComparisonMetric {
  const difference = safeInteger(current - previous, 'Previous-period difference');
  const direction: ComparisonDirection = difference > 0
    ? 'increased'
    : difference < 0
      ? 'decreased'
      : 'unchanged';
  const tone: ComparisonTone = difference === 0 || !previousPeriodHasTransactions
    ? 'neutral'
    : (difference > 0) === higherIsBetter
      ? 'positive'
      : 'negative';
  return {
    current,
    previous,
    difference,
    percentageChangeBasisPoints: previous === 0
      ? null
      : calculateBasisPoints(difference, previous),
    direction,
    tone,
    hasPreviousData: previousPeriodHasTransactions,
  };
}

export class ReportService {
  constructor(private readonly repository: ReportRepository) {}

  async load(
    selection: ReportPeriodSelection,
    today?: string,
  ): Promise<ReportData> {
    const period = resolveReportPeriod(selection, today);
    const previousPeriod = previousEquivalentPeriod(period);
    const [
      summaryAggregate,
      previousSummaryAggregate,
      rawCashFlow,
      rawCategories,
      rawNetWorth,
    ] = await Promise.all([
      this.repository.summarize(period),
      this.repository.summarize(previousPeriod),
      this.repository.cashFlow(period),
      this.repository.categoryExpenses(period),
      this.repository.netWorth(period, period.grouping),
    ]);

    const summary = normalizeSummary(summaryAggregate);
    const previousSummary = normalizeSummary(previousSummaryAggregate);
    const buckets = enumerateReportBuckets(period);
    const cashFlowByKey = new Map(rawCashFlow.map((bucket) => [bucket.key, bucket]));
    const cashFlow: CashFlowBucket[] = buckets.map((bucket) => {
      const aggregate = cashFlowByKey.get(bucket.key);
      const income = aggregate?.income ?? 0;
      const expenses = aggregate?.expenses ?? 0;
      return {
        ...bucket,
        income,
        expenses,
        net: safeInteger(income - expenses, 'Cash-flow net result'),
      };
    });

    const categoryExpenses = this.normalizeCategories(rawCategories);
    const netWorth = this.buildNetWorth(period, rawNetWorth.startingNetWorth, rawNetWorth.changes);
    const comparison = this.buildComparison(period, previousPeriod, summary, previousSummary);

    return { period, summary, cashFlow, categoryExpenses, netWorth, comparison };
  }

  private normalizeCategories(
    categories: Awaited<ReturnType<ReportRepository['categoryExpenses']>>,
  ): CategoryExpenseSummary[] {
    const totalExpenses = categories.reduce(
      (sum, category) => safeInteger(sum + category.total, 'Total category spending'),
      0,
    );
    return categories.map((category) => ({
      ...category,
      percentageBasisPoints: totalExpenses === 0
        ? 0
        : calculateBasisPoints(category.total, totalExpenses),
    }));
  }

  private buildNetWorth(
    period: ReportPeriod,
    startingNetWorth: number,
    changes: { key: string; amount: number }[],
  ): NetWorthPoint[] {
    const changeByKey = new Map(changes.map((change) => [change.key, change.amount]));
    let current = startingNetWorth;
    const points: NetWorthPoint[] = [{
      key: `start-${period.dateFrom}`,
      label: 'Start',
      date: dayBefore(period.dateFrom),
      netWorth: current,
      isStartingPoint: true,
    }];
    for (const bucket of enumerateReportBuckets(period)) {
      current = safeInteger(current + (changeByKey.get(bucket.key) ?? 0), 'Net worth');
      points.push({
        key: bucket.key,
        label: bucket.label,
        date: bucket.dateTo,
        netWorth: current,
        isStartingPoint: false,
      });
    }
    return points;
  }

  private buildComparison(
    currentPeriod: ReportPeriod,
    previousPeriod: ReportPeriod,
    current: PeriodSummary,
    previous: PeriodSummary,
  ): PreviousPeriodComparison {
    const previousHasTransactions = previous.incomeCount + previous.expenseCount > 0;
    return {
      currentPeriod,
      previousPeriod,
      income: buildComparisonMetric(current.income, previous.income, true, previousHasTransactions),
      expenses: buildComparisonMetric(current.expenses, previous.expenses, false, previousHasTransactions),
      net: buildComparisonMetric(current.net, previous.net, true, previousHasTransactions),
      averageExpense: buildComparisonMetric(
        current.averageExpense,
        previous.averageExpense,
        false,
        previousHasTransactions,
      ),
      expenseCount: buildComparisonMetric(
        current.expenseCount,
        previous.expenseCount,
        false,
        previousHasTransactions,
      ),
    };
  }
}
