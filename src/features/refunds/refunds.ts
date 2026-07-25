import { randomUUID } from 'expo-crypto';

import { transactionService } from '@/features/transactions/transactions';
import { RefundService } from './refund.service';
import { SQLiteRefundRepository } from './sqlite-refund.repository';

export const refundService = new RefundService(
  new SQLiteRefundRepository(),
  transactionService,
  randomUUID,
);
