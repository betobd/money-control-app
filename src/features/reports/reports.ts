import { loadValuationRates } from '@/features/exchange-rates/exchange-rates';
import { ReportService } from './report.service';
import { SQLiteReportRepository } from './sqlite-report.repository';

export const reportService = new ReportService(
  new SQLiteReportRepository(),
  // The net-worth timeline values foreign balances at the current saved rate
  // (Option A): no historical FX engine, and the series is labelled an estimate.
  loadValuationRates,
);
