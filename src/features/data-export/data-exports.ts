import { accountService } from '@/features/accounts/accounts';
import { budgetService } from '@/features/budgets/budgets';
import { loadValuationRates } from '@/features/exchange-rates/exchange-rates';
import { investmentPortfolioService, investmentValuationService } from '@/features/investments/investments';
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
  {
    getPortfolio: (rates) => investmentPortfolioService.getPortfolio(rates),
    listValuations: (accountId) => investmentValuationService.list(accountId),
  },
  new CsvSerializer(),
  new ExpoExportFileAdapter(),
  { resolveValuationRates: loadValuationRates },
);
