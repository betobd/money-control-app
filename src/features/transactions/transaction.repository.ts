import type { MonthlyTransactionSummary, TransactionListItem, TransactionRecord } from './transaction.types';
export interface TransactionRepository { create(transaction: TransactionRecord): Promise<void>; list(): Promise<TransactionListItem[]>; recent(limit: number): Promise<TransactionListItem[]>; summarizeMonth(month: string): Promise<MonthlyTransactionSummary>; }
