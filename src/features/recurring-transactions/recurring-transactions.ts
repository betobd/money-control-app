import { randomUUID } from 'expo-crypto';

import { loadValuationRates } from '@/features/exchange-rates/exchange-rates';
import { transactionService } from '@/features/transactions/transactions';
import { RecurringTransactionService } from './recurring-transaction.service';
import { SQLiteRecurringTransactionRepository } from './sqlite-recurring-transaction.repository';

export const recurringTransactionService = new RecurringTransactionService(
  new SQLiteRecurringTransactionRepository(),
  transactionService,
  randomUUID,
  undefined,
  undefined,
  // Resolve the saved rate for the occurrence's own currency when posting it.
  async (currency) => (await loadValuationRates()).snapshotInputFor(currency),
);
