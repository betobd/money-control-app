import type { ValuationRates } from '@/features/exchange-rates/valuation-rates';
import type {
  CategoryExpenseAggregate,
  InvestmentValuationSeriesRow,
  NetWorthAggregate,
  ReportBucketAggregate,
  ReportGrouping,
  ReportPeriod,
  ReportSummaryAggregate,
} from './report.types';

export interface ReportRepository {
  summarize(period: ReportPeriod): Promise<ReportSummaryAggregate>;
  cashFlow(period: ReportPeriod): Promise<ReportBucketAggregate[]>;
  categoryExpenses(period: ReportPeriod): Promise<CategoryExpenseAggregate[]>;
  netWorth(period: ReportPeriod, grouping: ReportGrouping, rates: ValuationRates): Promise<NetWorthAggregate>;
  /** All investment valuations (native unrealized adjustment), for the timeline overlay. */
  investmentValuationSeries(): Promise<InvestmentValuationSeriesRow[]>;
  /** Realized investment income posted within the period, in COP base snapshot minor units. */
  investmentIncome(period: ReportPeriod): Promise<{ baseMinor: number; count: number }>;
}
