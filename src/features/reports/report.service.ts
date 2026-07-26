import {
  dayBefore,
  enumerateReportBuckets,
  previousEquivalentPeriod,
  resolveReportPeriod,
} from './report-period';
import { convertUsdMinorToCopMinor, type ScaledRate } from '@/features/currency/currency';
import type { ReportRepository } from './report.repository';
import type {
  CashFlowBucket,
  CategoryExpenseSummary,
  ComparisonDirection,
  ComparisonMetric,
  ComparisonTone,
  InvestmentValuationSeriesRow,
  NetWorthPoint,
  PeriodSummary,
  PreviousPeriodComparison,
  ReportData,
  ReportPeriod,
  ReportPeriodSelection,
  ReportSummaryAggregate,
} from './report.types';

type InvestmentSeriesByAccount = Map<string, { currency: 'COP' | 'USD'; points: { date: string; unrealized: number }[] }>;

export function groupInvestmentSeries(rows: InvestmentValuationSeriesRow[]): InvestmentSeriesByAccount {
  const series: InvestmentSeriesByAccount = new Map();
  for (const row of rows) {
    const entry = series.get(row.accountId) ?? { currency: row.currency, points: [] };
    entry.points.push({ date: row.valuationDate, unrealized: row.unrealizedNativeMinor });
    series.set(row.accountId, entry);
  }
  for (const entry of series.values()) entry.points.sort((a, b) => a.date.localeCompare(b.date));
  return series;
}

/**
 * Total unrealized investment adjustment (Σ value − basis of the latest valuation
 * on or before `date`, per account) in COP. USD is converted at the valuation rate;
 * with no rate USD contributes 0, matching the base net-worth timeline (Option A).
 */
export function investmentAdjustmentAsOf(
  series: InvestmentSeriesByAccount,
  date: string,
  rate: ScaledRate | null,
): number {
  let total = 0;
  for (const entry of series.values()) {
    let unrealized = 0;
    for (const point of entry.points) {
      if (point.date <= date) unrealized = point.unrealized;
      else break;
    }
    if (unrealized === 0) continue;
    if (entry.currency === 'COP') total += unrealized;
    else if (rate) total += convertUsdMinorToCopMinor(unrealized, rate);
  }
  return safeInteger(total, 'Investment valuation adjustment');
}

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
  const expenses = safeInteger(
    aggregate.grossExpenses - aggregate.refunds,
    'Report net expenses',
  );
  const net = safeInteger(aggregate.income - expenses, 'Report net result');
  return {
    ...aggregate,
    expenses,
    net,
    averageExpense: roundedIntegerDivision(aggregate.grossExpenses, aggregate.expenseCount),
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
  constructor(
    private readonly repository: ReportRepository,
    private readonly resolveValuationRate: () => Promise<ScaledRate | null> = async () => null,
  ) {}

  async load(
    selection: ReportPeriodSelection,
    today?: string,
  ): Promise<ReportData> {
    const period = resolveReportPeriod(selection, today);
    const previousPeriod = previousEquivalentPeriod(period);
    const valuationRate = await this.resolveValuationRate();
    const [
      summaryAggregate,
      previousSummaryAggregate,
      rawCashFlow,
      rawCategories,
      rawNetWorth,
      valuationRows,
      investmentIncome,
    ] = await Promise.all([
      this.repository.summarize(period),
      this.repository.summarize(previousPeriod),
      this.repository.cashFlow(period),
      this.repository.categoryExpenses(period),
      this.repository.netWorth(period, period.grouping, valuationRate),
      this.repository.investmentValuationSeries(),
      this.repository.investmentIncome(period),
    ]);
    const investmentSeries = groupInvestmentSeries(valuationRows);

    const summary = normalizeSummary(summaryAggregate);
    const previousSummary = normalizeSummary(previousSummaryAggregate);
    const buckets = enumerateReportBuckets(period);
    const cashFlowByKey = new Map(rawCashFlow.map((bucket) => [bucket.key, bucket]));
    const cashFlow: CashFlowBucket[] = buckets.map((bucket) => {
      const aggregate = cashFlowByKey.get(bucket.key);
      const income = aggregate?.income ?? 0;
      const grossExpenses = aggregate?.grossExpenses ?? 0;
      const refunds = aggregate?.refunds ?? 0;
      const expenses = safeInteger(grossExpenses - refunds, 'Cash-flow net expenses');
      return {
        ...bucket,
        income,
        grossExpenses,
        refunds,
        expenses,
        net: safeInteger(income - expenses, 'Cash-flow net result'),
      };
    });

    const categoryExpenses = this.normalizeCategories(rawCategories);
    const netWorth = this.buildNetWorth(
      period,
      rawNetWorth.startingNetWorth,
      rawNetWorth.changes,
      investmentSeries,
      valuationRate,
    );
    const comparison = this.buildComparison(period, previousPeriod, summary, previousSummary);

    return {
      period,
      summary,
      cashFlow,
      categoryExpenses,
      netWorth,
      comparison,
      investments: { incomeCopMinor: investmentIncome.copMinor, incomeCount: investmentIncome.count },
    };
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
    investmentSeries: InvestmentSeriesByAccount,
    valuationRate: ScaledRate | null,
  ): NetWorthPoint[] {
    const changeByKey = new Map(changes.map((change) => [change.key, change.amount]));
    // `base` is the ledger net worth (investment accounts at net contributions);
    // the valuation adjustment overlays each investment's current mark as of the
    // point date, so the final point matches Home's estimated net worth.
    let base = startingNetWorth;
    const startDate = dayBefore(period.dateFrom);
    const points: NetWorthPoint[] = [{
      key: `start-${period.dateFrom}`,
      label: 'Start',
      date: startDate,
      netWorth: safeInteger(base + investmentAdjustmentAsOf(investmentSeries, startDate, valuationRate), 'Net worth'),
      isStartingPoint: true,
    }];
    for (const bucket of enumerateReportBuckets(period)) {
      base = safeInteger(base + (changeByKey.get(bucket.key) ?? 0), 'Net worth');
      points.push({
        key: bucket.key,
        label: bucket.label,
        date: bucket.dateTo,
        netWorth: safeInteger(
          base + investmentAdjustmentAsOf(investmentSeries, bucket.dateTo, valuationRate),
          'Net worth',
        ),
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
