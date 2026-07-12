export const supportedTransactionTypes = ['expense', 'income', 'transfer'] as const;

export type SupportedTransactionType = (typeof supportedTransactionTypes)[number];
export type CategorizedTransactionType = Exclude<SupportedTransactionType, 'transfer'>;
export type TransactionStatus = 'posted' | 'voided';

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
    })
  | (TransactionInputBase & TransactionMetadata & {
      type: 'transfer';
      categoryId: null;
      destinationAccountId: string;
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
};

export type TransactionSection = {
  id: string;
  label: string;
  transactions: TransactionListItem[];
};

export type MonthlyTransactionSummary = {
  income: number;
  expenses: number;
  net: number;
};
