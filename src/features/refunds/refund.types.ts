import type { TransactionListItem, TransactionRecord } from '@/features/transactions/transaction.types';

export type RefundInput = {
  originalTransactionId: string;
  amount: number;
  transactionDate: string;
  note: string | null;
};

export type RefundCreateRecord = {
  id: string;
  originalTransactionId: string;
  amount: number;
  transactionDate: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RefundSummary = {
  original: TransactionListItem;
  refunds: TransactionListItem[];
  grossAmount: number;
  refundedAmount: number;
  netExpense: number;
  refundableRemaining: number;
  refundStatus: 'none' | 'partial' | 'full';
};

export type RefundValidationErrors = Partial<Record<'amount' | 'transactionDate' | 'note', string>>;

export interface RefundRepository {
  createAtomic(record: RefundCreateRecord, today: string): Promise<TransactionRecord>;
  voidAtomic(id: string, updatedAt: string): Promise<TransactionRecord>;
}

export type RefundActionErrorCode =
  | 'original_not_found'
  | 'original_not_posted_expense'
  | 'refund_not_found'
  | 'refund_already_voided'
  | 'refund_exceeds_remaining'
  | 'refund_date_before_expense'
  | 'refund_date_in_future'
  | 'refund_write_conflict';

