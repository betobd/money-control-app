import { randomUUID } from 'expo-crypto';

import { transactionService } from '@/features/transactions/transactions';
import { RecurringTransactionService } from './recurring-transaction.service';
import { SQLiteRecurringTransactionRepository } from './sqlite-recurring-transaction.repository';

export const recurringTransactionService = new RecurringTransactionService(
  new SQLiteRecurringTransactionRepository(),
  transactionService,
  randomUUID,
);
