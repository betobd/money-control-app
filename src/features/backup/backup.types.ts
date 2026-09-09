import type { BudgetColorKey } from '@/constants/theme';
import type { CurrencyCode } from '@/features/currency/currency';

export const BACKUP_FORMAT = 'money-control-backup' as const;
export const CURRENT_BACKUP_FORMAT_VERSION = 7 as const;
export const CURRENT_DATABASE_SCHEMA_VERSION = '0015' as const;
export const BACKUP_TIMEZONE = 'America/Bogota' as const;
/** The fixed base currency of the backup envelope (consolidated reporting is COP). */
export const BACKUP_CURRENCY = 'COP' as const;
export const BACKUP_CHECKSUM_ALGORITHM = 'SHA-256' as const;

/**
 * Account currency is COP or USD as of format v4. Format v5 adds the `investment`
 * type (an investment account always has an `investmentAccounts` metadata row).
 */
export type BackupAccount = {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment' | 'other';
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

/** Flat category, format v1-v5. */
export type BackupCategoryV5 = {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Format v6 category: a null parent is a category, a set parent a subcategory.
 * Depth is capped at two, so a row with a parent never has children of its own.
 */
export type BackupCategory = BackupCategoryV5 & {
  parentCategoryId: string | null;
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

/** Format v4/v5 transaction: COP or USD, COP base snapshot, rate snapshot, transfer legs. */
export type BackupTransactionV5 = Omit<BackupTransactionV3, 'currency'> & {
  currency: CurrencyCode;
  baseAmountMinor: number | null;
  exchangeRateScaled: number | null;
  exchangeRateScale: number | null;
  exchangeRateDate: string | null;
  exchangeRateSource: ExchangeRateSnapshotSource | null;
  destinationAmountMinor: number | null;
  destinationCurrencyCode: CurrencyCode | null;
};

/**
 * Format v6 transaction: adds the optional subcategory. `categoryId` keeps its
 * meaning and always holds the parent, so every aggregate built on it reads the
 * same before and after the upgrade.
 */
export type BackupTransactionV6 = BackupTransactionV5 & {
  subcategoryId: string | null;
};

/**
 * Format v7 canonical transaction: the snapshot says which currencies it is in.
 *
 * Up to v6 a `baseAmountMinor` meant COP and an `exchangeRateScaled` meant COP
 * per USD, because those were the only possibilities. With a configurable base
 * currency neither is inferable from the row, so both are written down.
 */
export type BackupTransaction = BackupTransactionV6 & {
  baseCurrencyCode: CurrencyCode | null;
  exchangeRateBaseCode: CurrencyCode | null;
  exchangeRateQuoteCode: CurrencyCode | null;
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
  /** Optional swatch key. Absent in backups created before schema 0010. */
  color?: BudgetColorKey | null;
  /** Recurring-rule link. Absent in backups created before schema 0011. */
  ruleId?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Recurring-budget template (schema 0011+). */
export type BackupBudgetRule = {
  id: string;
  categoryId: string;
  limitAmount: number;
  color?: BudgetColorKey | null;
  startMonth: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Overall monthly spending ceiling (schema 0015+). */
export type BackupMonthlyBudget = {
  id: string;
  month: string;
  limitAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BackupRecurringTransactionV5 = {
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

/** Format v6 recurring rule: carries the subcategory its occurrences inherit. */
export type BackupRecurringTransaction = BackupRecurringTransactionV5 & {
  subcategoryId: string | null;
};

/** Investment-account metadata (format v5+); one row per `investment` account. */
export type BackupInvestmentAccount = {
  accountId: string;
  investmentType: 'brokerage' | 'fixed_term_deposit' | 'voluntary_pension' | 'investment_fund' | 'private_investment' | 'other';
  trackingMode: 'balance';
  liquidity: 'liquid' | 'restricted' | 'locked';
  providerName: string | null;
  startDate: string | null;
  maturityDate: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

/** One manual investment valuation (format v5+), in the account's native currency. */
export type BackupInvestmentValuation = {
  id: string;
  investmentAccountId: string;
  valueMinor: number;
  basisMinor: number;
  currencyCode: CurrencyCode;
  valuationDate: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BackupRecurringOccurrenceV5 = {
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

/** Format v6 occurrence: the subcategory inherited from its rule. */
export type BackupRecurringOccurrence = BackupRecurringOccurrenceV5 & {
  subcategoryId: string | null;
};

export type BackupDataV1 = {
  accounts: BackupAccountV1[];
  categories: BackupCategoryV5[];
  transactions: BackupTransactionV2[];
  transactionSplits: BackupTransactionSplit[];
  budgets: BackupBudget[];
  recurringTransactions: BackupRecurringTransactionV5[];
  recurringOccurrences: BackupRecurringOccurrenceV5[];
};

export type BackupDataV2 = {
  accounts: BackupAccount[];
  categories: BackupCategoryV5[];
  transactions: BackupTransactionV2[];
  transactionSplits: BackupTransactionSplit[];
  budgets: BackupBudget[];
  recurringTransactions: BackupRecurringTransactionV5[];
  recurringOccurrences: BackupRecurringOccurrenceV5[];
  creditCardStatements: BackupCreditCardStatement[];
};

export type BackupDataV3 = Omit<BackupDataV2, 'transactions'> & {
  transactions: BackupTransactionV3[];
};

/** Format-v4 data shape (multi-currency; no investments). */
export type BackupDataV4 = Omit<BackupDataV3, 'transactions'> & {
  transactions: BackupTransactionV5[];
  /** Portable latest USD/COP valuation rate, or null. */
  exchangeRate: BackupExchangeRate | null;
  /** Recurring-budget templates (schema 0011+). Absent in older backups. */
  budgetRules?: BackupBudgetRule[];
  /**
   * Overall monthly ceilings (schema 0015+). Optional for the same reason
   * `budgetRules` is: the collection is purely additive, so a file written before
   * it existed stays a valid v7 file and restores with no ceiling.
   */
  monthlyBudgets?: BackupMonthlyBudget[];
};

/** Format-v5 data shape: adds investment accounts + valuations. */
export type BackupDataV5 = BackupDataV4 & {
  investmentAccounts: BackupInvestmentAccount[];
  investmentValuations: BackupInvestmentValuation[];
};

/**
 * Canonical current data shape (format v6): two-level categories.
 *
 * Only the four category-bearing collections change; every other collection is
 * byte-for-byte what v5 wrote, which is why a v5 file upgrades by filling nulls
 * rather than by transforming anything.
 */
export type BackupDataV6 = Omit<
  BackupDataV5,
  'categories' | 'transactions' | 'recurringTransactions' | 'recurringOccurrences'
> & {
  categories: BackupCategory[];
  transactions: BackupTransactionV6[];
  recurringTransactions: BackupRecurringTransaction[];
  recurringOccurrences: BackupRecurringOccurrence[];
};

/**
 * Canonical current data shape (format v7): configurable base currency.
 *
 * `exchangeRate` (one USD/COP pair) becomes `exchangeRates` (one row per pair),
 * and the device's base currency is written down rather than assumed to be COP.
 */
export type BackupDataV7 = Omit<BackupDataV6, 'transactions' | 'exchangeRate'> & {
  transactions: BackupTransaction[];
  /** The base currency every `baseAmountMinor` in this file is denominated in. */
  baseCurrencyCode: CurrencyCode;
  exchangeRates: BackupExchangeRate[];
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

/** Format-v5 summary: adds investment collection counts. */
export type BackupSummaryV5 = BackupSummary & {
  investmentAccounts: number;
  investmentValuations: number;
};

export type BackupSummaryV1 = Omit<BackupSummary, 'creditCardStatements'>;

export type BackupTransactionDateRange = {
  oldest: string | null;
  newest: string | null;
};

export type BackupOverview = {
  summary: BackupSummaryV5;
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
  formatVersion: 4;
  data: BackupDataV4;
};

export type BackupFileV5 = Omit<BackupFileV4, 'formatVersion' | 'data' | 'summary'> & {
  formatVersion: 5;
  summary: BackupSummaryV5;
  data: BackupDataV5;
};

export type BackupFileV6 = Omit<BackupFileV5, 'formatVersion' | 'data'> & {
  formatVersion: 6;
  data: BackupDataV6;
};

/**
 * Format v7. `currency` stops being the literal 'COP': it names the base
 * currency this file was written with, which restore uses to keep every stored
 * `baseAmountMinor` meaningful.
 */
export type BackupFileV7 = Omit<BackupFileV6, 'formatVersion' | 'data' | 'currency'> & {
  formatVersion: typeof CURRENT_BACKUP_FORMAT_VERSION;
  currency: CurrencyCode;
  data: BackupDataV7;
};

export type BackupFile =
  | BackupFileV1
  | BackupFileV2
  | BackupFileV3
  | BackupFileV4
  | BackupFileV5
  | BackupFileV6
  | BackupFileV7;

export type BackupPreview = {
  fileName: string;
  fileSize: number;
  createdAt: string;
  formatVersion: number;
  appVersion: string;
  currency: string;
  schemaVersion: string;
  summary: BackupSummaryV5;
  transactionDateRange: BackupTransactionDateRange;
  compatible: true;
  warnings: string[];
};

export type RestoreCandidate = {
  file: BackupFile;
  data: BackupDataV7;
  preview: BackupPreview;
};

export type BackupExportResult = {
  fileName: string;
  fileSize: number;
  summary: BackupSummaryV5;
  transactionDateRange: BackupTransactionDateRange;
  nativeShareOpened: true;
};

export type BackupRestoreResult = BackupOverview;
