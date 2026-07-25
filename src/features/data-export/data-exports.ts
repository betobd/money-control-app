import { accountService } from '@/features/accounts/accounts';
import { budgetService } from '@/features/budgets/budgets';
import { exchangeRateService } from '@/features/exchange-rates/exchange-rates';
import { recurringTransactionService } from '@/features/recurring-transactions/recurring-transactions';
import { reportService } from '@/features/reports/reports';
import { transactionService } from '@/features/transactions/transactions';
import { CsvSerializer } from './csv-serializer';
import { DataExportService } from './data-export.service';
import { ExpoExportFileAdapter } from './expo-export-file.adapter';
import { SQLiteDataExportRepository } from './sqlite-data-export.repository';

export const dataExportService = new DataExportService(
  new SQLiteDataExportRepository(),
  accountService,
  budgetService,
  recurringTransactionService,
  reportService,
  transactionService,
  new CsvSerializer(),
  new ExpoExportFileAdapter(),
  {
    resolveValuationRate: async () => {
      const rate = await exchangeRateService.getValuationRate();
      return rate
        ? { rateScaled: rate.rateScaled, rateScale: rate.rateScale, effectiveDate: rate.effectiveDate, source: rate.source }
        : null;
    },
  },
);
