import {
  dayBefore,
  enumerateReportBuckets,
  previousEquivalentPeriod,
  resolveReportPeriod,
} from './report-period';
import { convertUsdMinorToCopMinor, type ScaledRate } from '@/features/currency/currency';
import { calculateBasisPoints, roundedIntegerDivision, safeInteger } from './report-math';
import { cumulativePace, foldCategoryExpenses, savingsRateBasisPoints, weekdaySpending } from './report-insights';
import type { ReportRepository } from './report.repository';
import type {
  CashFlowBucket,
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
  ReportBucketAggregate,
  ReportSummaryAggregate,
} from './report.types';

// Re-exported so existing importers of the service keep a single entry point
// after the integer helpers moved into report-math.
export { calculateBasisPoints } from './report-math';

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





/**
 * Joins sparse repository aggregates onto the period's complete bucket list, so
 * a day or month with no activity is an explicit zero rather than a gap. Charts
 * depend on this: a missing bucket would silently compress the time axis.
 */
function fillBuckets(
  buckets: ReturnType<typeof enumerateReportBuckets>,
  aggregates: ReportBucketAggregate[],
): CashFlowBucket[] {
  const byKey = new Map(aggregates.map((bucket) => [bucket.key, bucket]));
  return buckets.map((bucket) => {
    const aggregate = byKey.get(bucket.key);
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
    savingsRateBasisPoints: savingsRateBasisPoints(aggregate.income, net),
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
      rawPreviousCashFlow,
      rawCategories,
      rawNetWorth,
      valuationRows,
      investmentIncome,
    ] = await Promise.all([
      this.repository.summarize(period),
      this.repository.summarize(previousPeriod),
      this.repository.cashFlow(period),
      this.repository.cashFlow(previousPeriod),
      this.repository.categoryExpenses(period),
      this.repository.netWorth(period, period.grouping, valuationRate),
      this.repository.investmentValuationSeries(),
      this.repository.investmentIncome(period),
    ]);
    const investmentSeries = groupInvestmentSeries(valuationRows);

    const summary = normalizeSummary(summaryAggregate);
    const previousSummary = normalizeSummary(previousSummaryAggregate);
    const cashFlow = fillBuckets(enumerateReportBuckets(period), rawCashFlow);

    const previousCashFlow = fillBuckets(enumerateReportBuckets(previousPeriod), rawPreviousCashFlow);
    const categoryExpenses = foldCategoryExpenses(rawCategories);
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
      // Weekday breakdown needs daily resolution; a month-grouped period has none.
      weekdaySpending: period.grouping === 'day' ? weekdaySpending(cashFlow) : [],
      pace: cumulativePace(cashFlow, previousCashFlow),
      categoryExpenses,
      netWorth,
      comparison,
      investments: { incomeCopMinor: investmentIncome.copMinor, incomeCount: investmentIncome.count },
    };
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
