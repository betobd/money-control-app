import { randomUUID } from 'expo-crypto';

import { exchangeRateService } from '@/features/exchange-rates/exchange-rates';
import { transactionService } from '@/features/transactions/transactions';
import { RecurringTransactionService } from './recurring-transaction.service';
import { SQLiteRecurringTransactionRepository } from './sqlite-recurring-transaction.repository';

export const recurringTransactionService = new RecurringTransactionService(
  new SQLiteRecurringTransactionRepository(),
  transactionService,
  randomUUID,
  undefined,
  undefined,
  // Resolve the current USD/COP snapshot when posting a foreign occurrence.
  async () => {
    const rate = await exchangeRateService.getValuationRate();
    if (!rate) return null;
    return {
      rateScaled: rate.rateScaled,
      rateScale: rate.rateScale,
      effectiveDate: rate.effectiveDate,
      source: rate.source,
    };
  },
);
