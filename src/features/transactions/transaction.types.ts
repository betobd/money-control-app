import type { CurrencyCode } from '@/features/currency/currency';

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

export type ExchangeRateSnapshotSource =
  | 'frankfurter'
  | 'manual'
  | 'transfer_effective'
  | 'frankfurter_prefill';

/** Rate snapshot supplied with a foreign-currency transaction at record time. */
export type ExchangeRateSnapshotInput = {
  rateScaled: number;
  rateScale: number;
  effectiveDate: string;
  source: ExchangeRateSnapshotSource;
};

type TransactionInputBase = {
  amount: number;
  /**
   * The native currency of `amount` (source currency for transfers). Optional: the
   * service derives it from the account when omitted, and the account is the source
   * of truth. Provide it only to assert an expected currency.
   */
  currency?: CurrencyCode;
  accountId: string;
  transactionDate: string;
  note: string | null;
  /** Required when the native currency is not COP (or for cross-currency transfers). */
  exchangeRate?: ExchangeRateSnapshotInput | null;
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
      /** Destination leg amount (destination currency minor units). Defaults to `amount` for same-currency. */
      destinationAmountMinor?: number;
      /** Destination currency. Derived from the destination account when omitted. */
      destinationCurrencyCode?: CurrencyCode;
    });

/** A transaction input with currency and transfer legs fully resolved by the service. */
export type ResolvedTransactionInput =
  | (Omit<TransactionInputBase, 'currency'> & {
      currency: CurrencyCode;
      type: CategorizedTransactionType;
      categoryId: string;
      destinationAccountId: null;
    })
  | (Omit<TransactionInputBase, 'currency'> & {
      currency: CurrencyCode;
      type: 'transfer';
      categoryId: null;
      destinationAccountId: string;
      destinationAmountMinor: number;
      destinationCurrencyCode: CurrencyCode;
    });

type TransactionMetadata = {
  id: string;
  status: TransactionStatus;
  currency: CurrencyCode;
  createdAt: string;
  updatedAt: string;
};

/** Persisted currency snapshot columns shared by every transaction record. */
export type TransactionSnapshotFields = {
  /** COP base-currency amount for income/expense/refund; null for transfers. */
  baseAmountMinor: number | null;
  exchangeRateScaled: number | null;
  exchangeRateScale: number | null;
  exchangeRateDate: string | null;
  exchangeRateSource: ExchangeRateSnapshotSource | null;
  /** Destination leg for transfers; null otherwise. */
  destinationAmountMinor: number | null;
  destinationCurrencyCode: CurrencyCode | null;
};

type RecordBase = Omit<TransactionInputBase, 'exchangeRate'> & TransactionMetadata & TransactionSnapshotFields;

export type TransactionRecord =
  | (RecordBase & {
      type: CategorizedTransactionType;
      categoryId: string;
      destinationAccountId: null;
      originalTransactionId: null;
    })
  | (RecordBase & {
      type: 'transfer';
      categoryId: null;
      destinationAccountId: string;
      originalTransactionId: null;
    })
  | (RecordBase & {
      type: 'refund';
      categoryId: null;
      destinationAccountId: null;
      originalTransactionId: string;
    });

export type TransactionUpdateRecord = {
  amount: number;
  currency: CurrencyCode;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  transactionDate: string;
  note: string | null;
  updatedAt: string;
} & TransactionSnapshotFields;

export type TransactionField =
  | 'type'
  | 'amount'
  | 'currency'
  | 'accountId'
  | 'destinationAccountId'
  | 'destinationAmount'
  | 'categoryId'
  | 'transactionDate'
  | 'note'
  | 'exchangeRate';

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
