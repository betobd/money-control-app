export const BACKUP_FORMAT = 'money-control-backup' as const;
export const CURRENT_BACKUP_FORMAT_VERSION = 1 as const;
export const CURRENT_DATABASE_SCHEMA_VERSION = '0005' as const;
export const BACKUP_TIMEZONE = 'America/Bogota' as const;
export const BACKUP_CURRENCY = 'COP' as const;
export const BACKUP_CHECKSUM_ALGORITHM = 'SHA-256' as const;

export type BackupAccount = {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'cash' | 'other';
  currency: 'COP';
  openingBalance: number;
  creditLimit: number | null;
  isArchived: boolean;
  archivedAt: string | null;
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

export type BackupTransaction = {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  status: 'posted' | 'voided';
  amount: number;
  currency: 'COP';
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  note: string | null;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
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
  currency: 'COP';
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
  currency: 'COP';
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  note: string | null;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BackupDataV1 = {
  accounts: BackupAccount[];
  categories: BackupCategory[];
  transactions: BackupTransaction[];
  transactionSplits: BackupTransactionSplit[];
  budgets: BackupBudget[];
  recurringTransactions: BackupRecurringTransaction[];
  recurringOccurrences: BackupRecurringOccurrence[];
};

export type BackupSummary = {
  accounts: number;
  categories: number;
  transactions: number;
  transactionSplits: number;
  budgets: number;
  recurringRules: number;
  recurringOccurrences: number;
};

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
  formatVersion: typeof CURRENT_BACKUP_FORMAT_VERSION;
  appVersion: string;
  createdAt: string;
  timezone: typeof BACKUP_TIMEZONE;
  currency: typeof BACKUP_CURRENCY;
  schemaVersion: string;
  summary: BackupSummary;
  transactionDateRange: BackupTransactionDateRange;
  data: BackupDataV1;
  integrity: {
    algorithm: typeof BACKUP_CHECKSUM_ALGORITHM;
    checksum: string;
  };
};

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
  file: BackupFileV1;
  data: BackupDataV1;
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
