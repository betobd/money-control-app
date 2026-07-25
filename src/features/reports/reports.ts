import { exchangeRateService } from '@/features/exchange-rates/exchange-rates';
import { ReportService } from './report.service';
import { SQLiteReportRepository } from './sqlite-report.repository';

export const reportService = new ReportService(
  new SQLiteReportRepository(),
  // Net-worth timeline values USD balances at the current saved rate (Option A).
  async () => {
    const rate = await exchangeRateService.getValuationRate();
    return rate ? { rateScaled: rate.rateScaled, rateScale: rate.rateScale } : null;
  },
);
