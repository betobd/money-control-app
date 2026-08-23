import type { AccountWithBalance } from '@/features/accounts/account.types';
import type { CreditCardPaymentRecord } from '@/features/credit-cards/credit-card.repository';
import type { CreditCardStatement } from '@/features/credit-cards/credit-card.types';
import type { TransactionDateRange } from '@/features/transactions/transaction-date';
import type {
  TransactionFilterOptions,
  TransactionListFilters,
  TransactionListQuery,
} from '@/features/transactions/transaction.types';

export const exportLimits = {
  transactionRows: 50_000,
  largeTransactionWarningRows: 25_000,
  otherRows: 10_000,
  investmentValuationRows: 50_000,
  transactionBatchSize: 1_000,
} as const;

export type DataExportKind =
  | 'transactions'
  | 'accounts'
  | 'budgets'
  | 'recurring-rules'
  | 'credit-card-statements'
  | 'report-summary'
  | 'investments'
  | 'investment-valuations';

export type TransactionExportOptions = {
  filters: TransactionListFilters;
  includeNotes: boolean;
};

export type RecurringExportOptions = {
  includeNotes: boolean;
};

export type TransactionExportQuery = Omit<
  TransactionListQuery,
  'cursor' | 'limit' | 'search'
>;

export type TransactionExportPreview = {
  count: number;
  dateRange: TransactionDateRange;
  estimatedBytes: number;
  isLarge: boolean;
  exceedsLimit: boolean;
};

export type DataExportOverview = {
  accounts: number;
  budgets: number;
  recurringRules: number;
  creditCardStatements: number;
  reportMetrics: number;
  investments: number;
  transactionFilters: TransactionFilterOptions;
  transactions: TransactionExportPreview;
};

export type TransactionExportRow = {
  transactionId: string;
  transactionDate: string;
  type: 'expense' | 'income' | 'transfer' | 'refund';
  status: 'posted' | 'voided';
  currencyCode: string;
  amountCop: number;
  baseCurrencyAmountCop: number | null;
  exchangeRate: number | null;
  exchangeRateDate: string | null;
  exchangeRateSource: string | null;
  destinationAmountMinor: number | null;
  destinationCurrencyCode: string | null;
  categoryId: string | null;
  categoryName: string | null;
  subcategoryId: string | null;
  subcategoryName: string | null;
  originalTransactionId: string | null;
  originalTransactionDate: string | null;
  originalTransactionAmountCop: number | null;
  originalTransactionNote: string | null;
  sourceAccountId: string;
  sourceAccountName: string;
  destinationAccountId: string | null;
  destinationAccountName: string | null;
  note: string | null;
  recurringOccurrenceId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TransactionExportCount = {
  count: number;
  oldestDate: string | null;
  newestDate: string | null;
};

export type CreditCardStatementExportSource = {
  statement: CreditCardStatement;
  cardName: string;
  payments: CreditCardPaymentRecord[];
};

export type AccountExportSource = AccountWithBalance;

export type ExportResult = {
  kind: DataExportKind;
  fileName: string;
  fileSize: number;
  rowCount: number;
  nativeInterfaceOpened: true;
};

export type ExportOperation = DataExportKind | 'loading' | null;
