import type {
  CategoryExpenseAggregate,
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
  netWorth(period: ReportPeriod, grouping: ReportGrouping): Promise<NetWorthAggregate>;
}
