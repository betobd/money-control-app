import type {
  MonthlyTransactionSummary,
  NormalizedTransactionListQuery,
  TransactionFilterOptions,
  TransactionListItem,
  TransactionListPage,
  TransactionRecord,
  TransactionUpdateRecord,
} from './transaction.types';

export interface TransactionRepository {
  create(transaction: TransactionRecord): Promise<void>;
  findById(id: string): Promise<TransactionListItem | null>;
  hasAny(): Promise<boolean>;
  list(query: NormalizedTransactionListQuery): Promise<TransactionListPage>;
  listFilterOptions(): Promise<TransactionFilterOptions>;
  recent(limit: number): Promise<TransactionListItem[]>;
  summarizeMonth(month: string): Promise<MonthlyTransactionSummary>;
  updatePosted(id: string, transaction: TransactionUpdateRecord): Promise<boolean>;
  voidPosted(id: string, updatedAt: string): Promise<boolean>;
}
