import type { ScaledRate } from '@/features/currency/currency';
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
  netWorth(period: ReportPeriod, grouping: ReportGrouping, valuationRate?: ScaledRate | null): Promise<NetWorthAggregate>;
}
