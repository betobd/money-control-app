import type { CurrencyCode } from '@/features/currency/currency';

export const BACKUP_FORMAT = 'money-control-backup' as const;
export const CURRENT_BACKUP_FORMAT_VERSION = 4 as const;
export const CURRENT_DATABASE_SCHEMA_VERSION = '0009' as const;
export const BACKUP_TIMEZONE = 'America/Bogota' as const;
/** The fixed base currency of the backup envelope (consolidated reporting is COP). */
export const BACKUP_CURRENCY = 'COP' as const;
export const BACKUP_CHECKSUM_ALGORITHM = 'SHA-256' as const;

/** Account currency is COP or USD as of format v4. Accounts gained no other fields. */
export type BackupAccount = {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'cash' | 'other';
  currency: CurrencyCode;
  openingBalance: number;
  creditLimit: number | null;
  statementClosingDay: number | null;
  paymentDueDay: number | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BackupAccountV1 = Omit<BackupAccount, 'statementClosingDay' | 'paymentDueDay'>;

export type ExchangeRateSnapshotSource =
  | 'frankfurter'
  | 'manual'
  | 'transfer_effective'
  | 'frankfurter_prefill';

/** Portable latest valuation rate (non-secret application data). */
export type BackupExchangeRate = {
  id: string;
  baseCurrencyCode: CurrencyCode;
  quoteCurrencyCode: CurrencyCode;
  rateScaled: number;
  rateScale: number;
  effectiveDate: string;
  fetchedAt: string;
  provider: string | null;
  source: 'frankfurter' | 'manual';
  createdAt: string;
  updatedAt: string;
};

export type BackupCreditCardStatement = {
  id: string;
  accountId: string;
  periodStart: string;
  periodEnd: string;
  closingDate: string;
  dueDate: string;
  statementBalance: number;
  minimumPayment: number;
  createdAt: string;
  updatedAt: string;
};

export type BackupCategory = {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BackupTransactionV2 = {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  status: 'posted' | 'voided';
  amount: number;
  currency: CurrencyCode;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  note: string | null;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
};

/** Format v3 transaction: refund + originalTransactionId, still COP-only. */
export type BackupTransactionV3 = Omit<BackupTransactionV2, 'type'> & {
  type: 'income' | 'expense' | 'transfer' | 'refund';
  originalTransactionId: string | null;
};

/** Format v4 canonical transaction: COP or USD, COP base snapshot, rate snapshot, transfer legs. */
export type BackupTransaction = Omit<BackupTransactionV3, 'currency'> & {
  currency: CurrencyCode;
  baseAmountMinor: number | null;
  exchangeRateScaled: number | null;
  exchangeRateScale: number | null;
  exchangeRateDate: string | null;
  exchangeRateSource: ExchangeRateSnapshotSource | null;
  destinationAmountMinor: number | null;
  destinationCurrencyCode: CurrencyCode | null;
};

export type BackupTransactionSplit = {
  id: string;
  transactionId: string;
  accountId: string;
  amount: number;
  position: number;
};

export type BackupBudget = {
  id: string;
  categoryId: string;
  month: string;
  limitAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type BackupRecurringTransaction = {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: CurrencyCode;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  note: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  startDate: string;
  nextOccurrenceDate: string;
  endDate: string | null;
  isActive: boolean;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BackupRecurringOccurrence = {
  id: string;
  recurringTransactionId: string;
  scheduledDate: string;
  status: 'pending' | 'posted' | 'skipped';
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: CurrencyCode;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  note: string | null;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BackupDataV1 = {
  accounts: BackupAccountV1[];
  categories: BackupCategory[];
  transactions: BackupTransactionV2[];
  transactionSplits: BackupTransactionSplit[];
  budgets: BackupBudget[];
  recurringTransactions: BackupRecurringTransaction[];
  recurringOccurrences: BackupRecurringOccurrence[];
};

export type BackupDataV2 = {
  accounts: BackupAccount[];
  categories: BackupCategory[];
  transactions: BackupTransactionV2[];
  transactionSplits: BackupTransactionSplit[];
  budgets: BackupBudget[];
  recurringTransactions: BackupRecurringTransaction[];
  recurringOccurrences: BackupRecurringOccurrence[];
  creditCardStatements: BackupCreditCardStatement[];
};

export type BackupDataV3 = Omit<BackupDataV2, 'transactions'> & {
  transactions: BackupTransactionV3[];
};

/** Canonical current data shape (format v4). */
export type BackupDataV4 = Omit<BackupDataV3, 'transactions'> & {
  transactions: BackupTransaction[];
  /** Portable latest USD/COP valuation rate, or null. */
  exchangeRate: BackupExchangeRate | null;
};

export type BackupSummary = {
  accounts: number;
  categories: number;
  transactions: number;
  transactionSplits: number;
  budgets: number;
  recurringRules: number;
  recurringOccurrences: number;
  creditCardStatements: number;
};

export type BackupSummaryV1 = Omit<BackupSummary, 'creditCardStatements'>;

export type BackupTransactionDateRange = {
  oldest: string | null;
  newest: string | null;
};

export type BackupOverview = {
  summary: BackupSummary;
  transactionDateRange: BackupTransactionDateRange;
};

export type BackupFileV1 = {
  format: typeof BACKUP_FORMAT;
  formatVersion: 1;
  appVersion: string;
  createdAt: string;
  timezone: typeof BACKUP_TIMEZONE;
  currency: typeof BACKUP_CURRENCY;
  schemaVersion: string;
  summary: BackupSummaryV1;
  transactionDateRange: BackupTransactionDateRange;
  data: BackupDataV1;
  integrity: {
    algorithm: typeof BACKUP_CHECKSUM_ALGORITHM;
    checksum: string;
  };
};

export type BackupFileV2 = Omit<BackupFileV1, 'formatVersion' | 'summary' | 'data'> & {
  formatVersion: 2;
  summary: BackupSummary;
  data: BackupDataV2;
};

export type BackupFileV3 = Omit<BackupFileV2, 'formatVersion' | 'data'> & {
  formatVersion: 3;
  data: BackupDataV3;
};

export type BackupFileV4 = Omit<BackupFileV3, 'formatVersion' | 'data'> & {
  formatVersion: typeof CURRENT_BACKUP_FORMAT_VERSION;
  data: BackupDataV4;
};

export type BackupFile = BackupFileV1 | BackupFileV2 | BackupFileV3 | BackupFileV4;

export type BackupPreview = {
  fileName: string;
  fileSize: number;
  createdAt: string;
  formatVersion: number;
  appVersion: string;
  currency: string;
  schemaVersion: string;
  summary: BackupSummary;
  transactionDateRange: BackupTransactionDateRange;
  compatible: true;
  warnings: string[];
};

export type RestoreCandidate = {
  file: BackupFile;
  data: BackupDataV4;
  preview: BackupPreview;
};

export type BackupExportResult = {
  fileName: string;
  fileSize: number;
  summary: BackupSummary;
  transactionDateRange: BackupTransactionDateRange;
  nativeShareOpened: true;
};

export type BackupRestoreResult = BackupOverview;
