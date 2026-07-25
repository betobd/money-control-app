export const supportedTransactionTypes = ['expense', 'income', 'transfer', 'refund'] as const;

export type SupportedTransactionType = (typeof supportedTransactionTypes)[number];
export type CategorizedTransactionType = 'expense' | 'income';
export type TransactionStatus = 'posted' | 'voided';
export type TransactionDateRangePreset =
  | 'current-month'
  | 'previous-month'
  | 'last-30-days'
  | 'custom'
  | 'all-time';

type TransactionInputBase = {
  amount: number;
  accountId: string;
  transactionDate: string;
  note: string | null;
};

export type TransactionInput =
  | (TransactionInputBase & {
      type: CategorizedTransactionType;
      categoryId: string;
      destinationAccountId?: null;
    })
  | (TransactionInputBase & {
      type: 'transfer';
      categoryId: null;
      destinationAccountId: string;
    });

type TransactionMetadata = {
  id: string;
  status: TransactionStatus;
  currency: 'COP';
  createdAt: string;
  updatedAt: string;
};

export type TransactionRecord =
  | (TransactionInputBase & TransactionMetadata & {
      type: CategorizedTransactionType;
      categoryId: string;
      destinationAccountId: null;
      originalTransactionId: null;
    })
  | (TransactionInputBase & TransactionMetadata & {
      type: 'transfer';
      categoryId: null;
      destinationAccountId: string;
      originalTransactionId: null;
    })
  | (TransactionInputBase & TransactionMetadata & {
      type: 'refund';
      categoryId: null;
      destinationAccountId: null;
      originalTransactionId: string;
    });

export type TransactionUpdateRecord = {
  amount: number;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  transactionDate: string;
  note: string | null;
  updatedAt: string;
};

export type TransactionField =
  | 'type'
  | 'amount'
  | 'accountId'
  | 'destinationAccountId'
  | 'categoryId'
  | 'transactionDate'
  | 'note';

export type TransactionValidationErrors = Partial<Record<TransactionField, string>>;

export type TransactionListItem = TransactionRecord & {
  accountName: string;
  destinationAccountName: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  originalTransactionDate: string | null;
  originalTransactionNote: string | null;
};

export type TransactionListCursor = Pick<
  TransactionRecord,
  'transactionDate' | 'createdAt' | 'id'
>;

export type TransactionListQuery = {
  search?: string;
  types?: SupportedTransactionType[];
  statuses?: TransactionStatus[];
  accountId?: string;
  categoryId?: string;
  originalTransactionId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  cursor?: TransactionListCursor;
};

export type NormalizedTransactionListQuery = Omit<TransactionListQuery, 'limit'> & {
  limit: number;
};

export type TransactionListPage = {
  items: TransactionListItem[];
  nextCursor: TransactionListCursor | null;
};

export type TransactionFilterAccount = {
  id: string;
  name: string;
  isArchived: boolean;
};

export type TransactionFilterCategory = TransactionFilterAccount & {
  type: CategorizedTransactionType;
};

export type TransactionFilterOptions = {
  accounts: TransactionFilterAccount[];
  categories: TransactionFilterCategory[];
};

export type TransactionListFilters = {
  type: SupportedTransactionType | null;
  status: TransactionStatus | null;
  accountId: string | null;
  categoryId: string | null;
  datePreset: TransactionDateRangePreset;
  customDateFrom: string;
  customDateTo: string;
};

export type TransactionSection = {
  id: string;
  label: string;
  transactions: TransactionListItem[];
};

export type MonthlyTransactionSummary = {
  income: number;
  grossExpenses: number;
  refunds: number;
  netExpenses: number;
  net: number;
};
