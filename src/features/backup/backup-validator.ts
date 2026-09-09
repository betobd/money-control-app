import { budgetColorKeys, type BudgetColorKey } from '@/constants/theme';
import { isSupportedCurrency } from '@/features/currency/currency';
import { backupLimits, utf8ByteLength } from './backup-limits';
import {
  BACKUP_CHECKSUM_ALGORITHM,
  BACKUP_FORMAT,
  BACKUP_TIMEZONE,
  type BackupBudgetRule,
  type BackupMonthlyBudget,
  type BackupFile,
  type BackupFileV1,
  type BackupFileV2,
  type BackupFileV3,
  type BackupFileV4,
  type BackupFileV5,
  type BackupFileV6,
  type BackupFileV7,
} from './backup.types';

export type BackupValidationIssueCode =
  | 'file_too_large'
  | 'nesting_too_deep'
  | 'invalid_json'
  | 'wrong_format'
  | 'invalid_structure'
  | 'invalid_value'
  | 'safety_limit'
  | 'duplicate_id'
  | 'duplicate_constraint'
  | 'missing_reference'
  | 'domain_mismatch'
  | 'checksum_mismatch';

export type BackupValidationIssue = {
  code: BackupValidationIssueCode;
  path: string;
  message: string;
};

/** Every format version this validator knows how to read. */
type BackupFormatVersion = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export class BackupValidationError extends Error {
  constructor(public readonly issues: BackupValidationIssue[]) {
    super(issues[0]?.message ?? 'The backup is invalid.');
  }
}

export type ParsedBackupEnvelope = {
  raw: Record<string, unknown>;
  formatVersion: number;
};

type ValidationIssues = BackupValidationIssue[];

const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const utcTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const checksumPattern = /^[a-fA-F0-9]{64}$/;

function issue(
  issues: ValidationIssues,
  code: BackupValidationIssueCode,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireRecord(
  value: unknown,
  path: string,
  issues: ValidationIssues,
): Record<string, unknown> | null {
  if (!isRecord(value)) {
    issue(issues, 'invalid_structure', path, `${path} must be an object.`);
    return null;
  }
  return value;
}

function requireArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
  limit: number,
  issues: ValidationIssues,
): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    issue(issues, 'invalid_structure', path, `${path} must be an array.`);
    return [];
  }
  if (value.length > limit) {
    issue(issues, 'safety_limit', path, `${path} exceeds the ${limit.toLocaleString('en-US')} record safety limit.`);
    return [];
  }
  return value;
}

function validateString(
  value: unknown,
  path: string,
  issues: ValidationIssues,
  options: { max?: number; nonBlank?: boolean } = {},
): value is string {
  if (typeof value !== 'string') {
    issue(issues, 'invalid_structure', path, `${path} must be text.`);
    return false;
  }
  const max = options.max ?? backupLimits.maxStringLength;
  if (value.length > max) {
    issue(issues, 'safety_limit', path, `${path} exceeds the ${max}-character safety limit.`);
  }
  if (options.nonBlank && !value.trim()) {
    issue(issues, 'invalid_value', path, `${path} cannot be blank.`);
  }
  return true;
}

function validateNullableString(
  value: unknown,
  path: string,
  issues: ValidationIssues,
  max: number = backupLimits.maxStringLength,
): value is string | null {
  return value === null || validateString(value, path, issues, { max });
}

function validateEnum(
  value: unknown,
  allowed: readonly string[],
  path: string,
  issues: ValidationIssues,
): value is string {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    issue(issues, 'invalid_value', path, `${path} contains an unsupported value.`);
    return false;
  }
  return true;
}

function isCalendarDate(value: string): boolean {
  if (!calendarDatePattern.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() + 1 === month
    && date.getUTCDate() === day;
}

function validateCalendarDate(value: unknown, path: string, issues: ValidationIssues): value is string {
  if (typeof value !== 'string' || !isCalendarDate(value)) {
    issue(issues, 'invalid_value', path, `${path} must be a valid Bogotá-local YYYY-MM-DD date.`);
    return false;
  }
  return true;
}

function validateNullableCalendarDate(
  value: unknown,
  path: string,
  issues: ValidationIssues,
): value is string | null {
  return value === null || validateCalendarDate(value, path, issues);
}

function validateUtcTimestamp(value: unknown, path: string, issues: ValidationIssues): value is string {
  const textValue = typeof value === 'string' ? value : null;
  const date = textValue !== null && utcTimestampPattern.test(textValue)
    ? new Date(textValue)
    : null;
  const valid = date !== null
    && Number.isFinite(date.getTime())
    && date.getUTCFullYear() === Number(textValue?.slice(0, 4))
    && date.getUTCMonth() + 1 === Number(textValue?.slice(5, 7))
    && date.getUTCDate() === Number(textValue?.slice(8, 10))
    && date.getUTCHours() === Number(textValue?.slice(11, 13))
    && date.getUTCMinutes() === Number(textValue?.slice(14, 16))
    && date.getUTCSeconds() === Number(textValue?.slice(17, 19));
  if (!valid) {
    issue(issues, 'invalid_value', path, `${path} must be a valid UTC ISO-8601 timestamp.`);
    return false;
  }
  return true;
}

function validateNullableUtcTimestamp(
  value: unknown,
  path: string,
  issues: ValidationIssues,
): value is string | null {
  return value === null || validateUtcTimestamp(value, path, issues);
}

function validateSafeInteger(
  value: unknown,
  path: string,
  issues: ValidationIssues,
  options: { positive?: boolean; nonNegative?: boolean; nonZero?: boolean } = {},
): value is number {
  if (!Number.isSafeInteger(value)) {
    issue(issues, 'invalid_value', path, `${path} must be a whole, safe integer.`);
    return false;
  }
  const numberValue = value as number;
  if (options.positive && numberValue <= 0) {
    issue(issues, 'invalid_value', path, `${path} must be positive.`);
  }
  if (options.nonNegative && numberValue < 0) {
    issue(issues, 'invalid_value', path, `${path} cannot be negative.`);
  }
  if (options.nonZero && numberValue === 0) {
    issue(issues, 'invalid_value', path, `${path} cannot be zero.`);
  }
  return true;
}

function validateId(value: unknown, path: string, issues: ValidationIssues): value is string {
  return validateString(value, path, issues, {
    max: backupLimits.maxIdLength,
    nonBlank: true,
  });
}

function validateBoolean(value: unknown, path: string, issues: ValidationIssues): value is boolean {
  if (typeof value !== 'boolean') {
    issue(issues, 'invalid_structure', path, `${path} must be true or false.`);
    return false;
  }
  return true;
}

/**
 * Which currencies a given format version was allowed to contain.
 *
 * Not a single "is it supported now" check: a v3 file claiming USD, or a v5 file
 * claiming EUR, was not writable by the app that produced it and is a sign the
 * file was edited. Each version is held to what it could legitimately hold.
 */
function validateCurrency(
  value: unknown,
  path: string,
  issues: ValidationIssues,
  version: BackupFormatVersion = 1,
): void {
  if (typeof value !== 'string') {
    issue(issues, 'domain_mismatch', path, `${path} must be a currency code.`);
    return;
  }
  if (version >= 7) {
    if (!isSupportedCurrency(value)) {
      issue(issues, 'domain_mismatch', path, `${path} must be a supported currency code.`);
    }
    return;
  }
  const allowed = version >= 4 ? ['COP', 'USD'] : ['COP'];
  if (!allowed.includes(value)) {
    issue(issues, 'domain_mismatch', path, `${path} must be ${allowed.join(' or ')}.`);
  }
}

function validateAuditFields(row: Record<string, unknown>, path: string, issues: ValidationIssues): void {
  validateUtcTimestamp(row.createdAt, `${path}.createdAt`, issues);
  validateUtcTimestamp(row.updatedAt, `${path}.updatedAt`, issues);
}

function validateArchiveFields(row: Record<string, unknown>, path: string, issues: ValidationIssues): void {
  validateBoolean(row.isArchived, `${path}.isArchived`, issues);
  validateNullableUtcTimestamp(row.archivedAt, `${path}.archivedAt`, issues);
}

function validateTransactionShape(
  row: Record<string, unknown>,
  path: string,
  issues: ValidationIssues,
  supportsRefunds = false,
  supportsSubcategories = false,
): void {
  const type = row.type;
  // A subcategory requires a category, so anything that cannot have a category
  // cannot have a subcategory either. This is the shape CHECK from migration
  // 0013, restated for a file the database has not seen yet.
  if (supportsSubcategories && row.categoryId === null && row.subcategoryId !== null) {
    issue(issues, 'domain_mismatch', `${path}.subcategoryId`, 'A subcategory requires a category.');
  }
  if (type === 'transfer') {
    if (!validateId(row.destinationAccountId, `${path}.destinationAccountId`, issues)) return;
    if (row.categoryId !== null) {
      issue(issues, 'domain_mismatch', `${path}.categoryId`, 'Transfers cannot have a category.');
    }
    if (row.accountId === row.destinationAccountId) {
      issue(issues, 'domain_mismatch', `${path}.destinationAccountId`, 'Transfer accounts must be different.');
    }
  } else if (type === 'income' || type === 'expense') {
    if (row.destinationAccountId !== null) {
      issue(issues, 'domain_mismatch', `${path}.destinationAccountId`, 'Income and expense rows cannot have a destination account.');
    }
    validateId(row.categoryId, `${path}.categoryId`, issues);
  } else if (type === 'refund' && supportsRefunds) {
    if (row.destinationAccountId !== null || row.categoryId !== null) {
      issue(issues, 'domain_mismatch', path, 'Refunds cannot have a destination account or direct category.');
    }
    validateId(row.originalTransactionId, `${path}.originalTransactionId`, issues);
    if (row.id === row.originalTransactionId) {
      issue(issues, 'domain_mismatch', `${path}.originalTransactionId`, 'A refund cannot reference itself.');
    }
  }
  if (supportsRefunds && type !== 'refund' && row.originalTransactionId !== null) {
    issue(issues, 'domain_mismatch', `${path}.originalTransactionId`, 'Only refunds may reference an original transaction.');
  }
}

function validateAccountRows(rows: unknown[], issues: ValidationIssues, version: BackupFormatVersion): void {
  const accountTypes = version >= 5
    ? ['checking', 'savings', 'credit_card', 'cash', 'investment', 'other']
    : ['checking', 'savings', 'credit_card', 'cash', 'other'];
  rows.forEach((value, index) => {
    const path = `data.accounts[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.id, `${path}.id`, issues);
    validateString(row.name, `${path}.name`, issues, { nonBlank: true });
    validateEnum(row.type, accountTypes, `${path}.type`, issues);
    validateCurrency(row.currency, `${path}.currency`, issues, version);
    validateSafeInteger(row.openingBalance, `${path}.openingBalance`, issues);
    if (row.creditLimit !== null) {
      validateSafeInteger(row.creditLimit, `${path}.creditLimit`, issues, { nonNegative: true });
      if (row.type !== 'credit_card') {
        issue(issues, 'domain_mismatch', `${path}.creditLimit`, 'Only credit cards may have a credit limit.');
      }
    }
    if (version >= 2) {
      for (const field of ['statementClosingDay', 'paymentDueDay'] as const) {
        const fieldValue = row[field];
        if (fieldValue !== null) {
          validateSafeInteger(fieldValue, `${path}.${field}`, issues, { positive: true });
          if (typeof fieldValue === 'number' && fieldValue > 31) {
            issue(issues, 'invalid_value', `${path}.${field}`, `${path}.${field} must be from 1 to 31.`);
          }
          if (row.type !== 'credit_card') {
            issue(issues, 'domain_mismatch', `${path}.${field}`, 'Only credit cards may have cycle settings.');
          }
        }
      }
      if ((row.statementClosingDay === null) !== (row.paymentDueDay === null)) {
        issue(issues, 'domain_mismatch', path, 'Credit-card closing and due days must both be present or both be absent.');
      }
    }
    validateArchiveFields(row, path, issues);
    validateAuditFields(row, path, issues);
  });
}

function validateCreditCardStatementRows(rows: unknown[], issues: ValidationIssues): void {
  rows.forEach((value, index) => {
    const path = `data.creditCardStatements[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.id, `${path}.id`, issues);
    validateId(row.accountId, `${path}.accountId`, issues);
    validateCalendarDate(row.periodStart, `${path}.periodStart`, issues);
    validateCalendarDate(row.periodEnd, `${path}.periodEnd`, issues);
    validateCalendarDate(row.closingDate, `${path}.closingDate`, issues);
    validateCalendarDate(row.dueDate, `${path}.dueDate`, issues);
    validateSafeInteger(row.statementBalance, `${path}.statementBalance`, issues, { nonNegative: true });
    validateSafeInteger(row.minimumPayment, `${path}.minimumPayment`, issues, { nonNegative: true });
    if (typeof row.statementBalance === 'number' && typeof row.minimumPayment === 'number' && row.minimumPayment > row.statementBalance) {
      issue(issues, 'domain_mismatch', `${path}.minimumPayment`, 'Minimum payment cannot exceed statement balance.');
    }
    if (typeof row.periodStart === 'string' && typeof row.periodEnd === 'string' && row.periodStart > row.periodEnd) {
      issue(issues, 'domain_mismatch', path, 'Statement period is reversed.');
    }
    if (typeof row.periodEnd === 'string' && typeof row.closingDate === 'string' && row.closingDate < row.periodEnd) {
      issue(issues, 'domain_mismatch', path, 'Statement closing date is before period end.');
    }
    if (typeof row.closingDate === 'string' && typeof row.dueDate === 'string' && row.dueDate < row.closingDate) {
      issue(issues, 'domain_mismatch', path, 'Statement due date is before closing date.');
    }
    validateAuditFields(row, path, issues);
  });
}

/**
 * Two-level categories exist from v6 on. Expressed as `>=` for the same reason as
 * {@link supportsRefunds}: an equality check against "the current version" stops
 * applying the moment a new version is added.
 */
function supportsCategoryHierarchy(file: BackupFile): file is BackupFileV6 | BackupFileV7 {
  return file.formatVersion >= 6;
}

/**
 * Refunds exist from v3 on. Expressed as `>=` rather than a list of versions:
 * an enumerated check silently stops applying the day a new version is added,
 * which is exactly how v6 briefly lost these rules.
 */
function supportsRefunds(
  file: BackupFile,
): file is BackupFileV3 | BackupFileV4 | BackupFileV5 | BackupFileV6 | BackupFileV7 {
  return file.formatVersion >= 3;
}

function validateCategoryRows(
  rows: unknown[],
  issues: ValidationIssues,
  version: BackupFormatVersion = 1,
): void {
  rows.forEach((value, index) => {
    const path = `data.categories[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.id, `${path}.id`, issues);
    validateString(row.name, `${path}.name`, issues, { nonBlank: true });
    validateEnum(row.type, ['expense', 'income'], `${path}.type`, issues);
    validateNullableString(row.icon, `${path}.icon`, issues);
    if (version >= 6) {
      validateNullableString(row.parentCategoryId, `${path}.parentCategoryId`, issues, backupLimits.maxIdLength);
      if (row.parentCategoryId === row.id) {
        issue(issues, 'domain_mismatch', `${path}.parentCategoryId`, 'A category cannot be its own parent.');
      }
    }
    validateArchiveFields(row, path, issues);
    validateAuditFields(row, path, issues);
  });
}

function validateInvestmentAccountRows(rows: unknown[], issues: ValidationIssues): void {
  rows.forEach((value, index) => {
    const path = `data.investmentAccounts[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.accountId, `${path}.accountId`, issues);
    validateEnum(row.investmentType, ['brokerage', 'fixed_term_deposit', 'voluntary_pension', 'investment_fund', 'private_investment', 'other'], `${path}.investmentType`, issues);
    validateEnum(row.trackingMode, ['balance'], `${path}.trackingMode`, issues);
    validateEnum(row.liquidity, ['liquid', 'restricted', 'locked'], `${path}.liquidity`, issues);
    validateNullableString(row.providerName, `${path}.providerName`, issues);
    validateNullableCalendarDate(row.startDate, `${path}.startDate`, issues);
    validateNullableCalendarDate(row.maturityDate, `${path}.maturityDate`, issues);
    if (typeof row.startDate === 'string' && typeof row.maturityDate === 'string' && row.maturityDate < row.startDate) {
      issue(issues, 'domain_mismatch', path, 'Investment maturity date is before its start date.');
    }
    validateNullableString(row.note, `${path}.note`, issues);
    validateAuditFields(row, path, issues);
  });
}

/** Portable valuation rates, one per ordered pair. */
function validateExchangeRateRows(
  rows: unknown[],
  issues: ValidationIssues,
  version: BackupFormatVersion,
): void {
  rows.forEach((value, index) => {
    const path = `data.exchangeRates[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.id, `${path}.id`, issues);
    validateCurrency(row.baseCurrencyCode, `${path}.baseCurrencyCode`, issues, version);
    validateCurrency(row.quoteCurrencyCode, `${path}.quoteCurrencyCode`, issues, version);
    if (row.baseCurrencyCode === row.quoteCurrencyCode) {
      issue(issues, 'domain_mismatch', path, 'An exchange rate must be between two different currencies.');
    }
    validateSafeInteger(row.rateScaled, `${path}.rateScaled`, issues, { positive: true });
    validateSafeInteger(row.rateScale, `${path}.rateScale`, issues, { positive: true });
    validateCalendarDate(row.effectiveDate, `${path}.effectiveDate`, issues);
    validateUtcTimestamp(row.fetchedAt, `${path}.fetchedAt`, issues);
    validateNullableString(row.provider, `${path}.provider`, issues);
    validateEnum(row.source, ['frankfurter', 'manual'], `${path}.source`, issues);
    validateAuditFields(row, path, issues);
  });
}

function validateInvestmentValuationRows(rows: unknown[], issues: ValidationIssues, version: BackupFormatVersion): void {
  rows.forEach((value, index) => {
    const path = `data.investmentValuations[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.id, `${path}.id`, issues);
    validateId(row.investmentAccountId, `${path}.investmentAccountId`, issues);
    validateSafeInteger(row.valueMinor, `${path}.valueMinor`, issues, { nonNegative: true });
    validateSafeInteger(row.basisMinor, `${path}.basisMinor`, issues);
    validateCurrency(row.currencyCode, `${path}.currencyCode`, issues, version);
    validateCalendarDate(row.valuationDate, `${path}.valuationDate`, issues);
    validateNullableString(row.note, `${path}.note`, issues);
    validateAuditFields(row, path, issues);
  });
}

const EXCHANGE_RATE_SOURCES = ['frankfurter', 'manual', 'transfer_effective', 'frankfurter_prefill'];

/** Format-v4 transaction currency snapshot: base COP amount, rate, and transfer legs. */
function validateTransactionCurrencyV4(
  row: Record<string, unknown>,
  path: string,
  issues: ValidationIssues,
  version: BackupFormatVersion,
  baseCurrency: string,
): void {
  const isTransfer = row.type === 'transfer';
  // "Foreign" means "not this file's base currency". Before v7 that was always
  // COP, so USD was the only foreign option; from v7 the file says which.
  const isForeign = row.currency !== baseCurrency;
  // Base COP snapshot: null for transfers; present (positive) for foreign income/expense/refund.
  if (isTransfer) {
    if (row.baseAmountMinor !== null) {
      issue(issues, 'domain_mismatch', `${path}.baseAmountMinor`, 'Transfers do not carry a base amount.');
    }
  } else if (row.baseAmountMinor !== null) {
    validateSafeInteger(row.baseAmountMinor, `${path}.baseAmountMinor`, issues, { positive: true });
  } else if (isForeign) {
    issue(issues, 'domain_mismatch', `${path}.baseAmountMinor`, 'A foreign-currency transaction requires a COP base amount.');
  }
  // Rate snapshot: required for foreign income/expense/refund and cross-currency transfers.
  const hasRate = row.exchangeRateScaled !== null;
  if (hasRate) {
    validateSafeInteger(row.exchangeRateScaled, `${path}.exchangeRateScaled`, issues, { positive: true });
    validateSafeInteger(row.exchangeRateScale, `${path}.exchangeRateScale`, issues, { positive: true });
    validateCalendarDate(row.exchangeRateDate, `${path}.exchangeRateDate`, issues);
    if (typeof row.exchangeRateSource !== 'string' || !EXCHANGE_RATE_SOURCES.includes(row.exchangeRateSource)) {
      issue(issues, 'invalid_value', `${path}.exchangeRateSource`, 'Invalid exchange-rate source.');
    }
  }
  if (!isTransfer && isForeign && !hasRate) {
    issue(issues, 'domain_mismatch', `${path}.exchangeRateScaled`, 'A foreign-currency transaction requires a rate snapshot.');
  }
  // Destination leg: present for transfers, absent otherwise.
  if (isTransfer) {
    validateSafeInteger(row.destinationAmountMinor, `${path}.destinationAmountMinor`, issues, { positive: true });
    validateCurrency(row.destinationCurrencyCode, `${path}.destinationCurrencyCode`, issues, version);
    const crossCurrency = row.destinationCurrencyCode !== row.currency;
    if (crossCurrency && !hasRate) {
      issue(issues, 'domain_mismatch', `${path}.exchangeRateScaled`, 'A cross-currency transfer requires a rate snapshot.');
    }
  } else {
    if (row.destinationAmountMinor !== null) {
      issue(issues, 'domain_mismatch', `${path}.destinationAmountMinor`, 'Only transfers carry a destination leg.');
    }
    if (row.destinationCurrencyCode !== null) {
      issue(issues, 'domain_mismatch', `${path}.destinationCurrencyCode`, 'Only transfers carry a destination currency.');
    }
  }
}

function validateTransactionRows(
  rows: unknown[],
  issues: ValidationIssues,
  version: BackupFormatVersion,
  baseCurrency: string,
): void {
  rows.forEach((value, index) => {
    const path = `data.transactions[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.id, `${path}.id`, issues);
    validateEnum(
      row.type,
      version >= 3 ? ['income', 'expense', 'transfer', 'refund'] : ['income', 'expense', 'transfer'],
      `${path}.type`,
      issues,
    );
    validateEnum(row.status, ['posted', 'voided'], `${path}.status`, issues);
    validateSafeInteger(row.amount, `${path}.amount`, issues, { positive: true });
    validateCurrency(row.currency, `${path}.currency`, issues, version);
    validateId(row.accountId, `${path}.accountId`, issues);
    validateNullableString(row.destinationAccountId, `${path}.destinationAccountId`, issues, backupLimits.maxIdLength);
    validateNullableString(row.categoryId, `${path}.categoryId`, issues, backupLimits.maxIdLength);
    if (version >= 6) {
      validateNullableString(row.subcategoryId, `${path}.subcategoryId`, issues, backupLimits.maxIdLength);
    }
    if (version >= 3) {
      validateNullableString(
        row.originalTransactionId,
        `${path}.originalTransactionId`,
        issues,
        backupLimits.maxIdLength,
      );
    }
    validateNullableString(row.note, `${path}.note`, issues, backupLimits.maxNoteLength);
    validateCalendarDate(row.transactionDate, `${path}.transactionDate`, issues);
    validateAuditFields(row, path, issues);
    validateTransactionShape(row, path, issues, version >= 3, version >= 6);
    if (version >= 4) validateTransactionCurrencyV4(row, path, issues, version, baseCurrency);
  });
}

function validateSplitRows(rows: unknown[], issues: ValidationIssues): void {
  rows.forEach((value, index) => {
    const path = `data.transactionSplits[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.id, `${path}.id`, issues);
    validateId(row.transactionId, `${path}.transactionId`, issues);
    validateId(row.accountId, `${path}.accountId`, issues);
    validateSafeInteger(row.amount, `${path}.amount`, issues, { nonZero: true });
    validateSafeInteger(row.position, `${path}.position`, issues, { nonNegative: true });
  });
}

function validateBudgetRows(rows: unknown[], issues: ValidationIssues): void {
  rows.forEach((value, index) => {
    const path = `data.budgets[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.id, `${path}.id`, issues);
    validateId(row.categoryId, `${path}.categoryId`, issues);
    if (typeof row.month !== 'string' || !monthPattern.test(row.month)) {
      issue(issues, 'invalid_value', `${path}.month`, 'Budget month must use YYYY-MM.');
    }
    validateSafeInteger(row.limitAmount, `${path}.limitAmount`, issues, { positive: true });
    if (
      row.color !== undefined &&
      row.color !== null &&
      (typeof row.color !== 'string' || !budgetColorKeys.includes(row.color as BudgetColorKey))
    ) {
      issue(issues, 'invalid_value', `${path}.color`, 'Budget color is not recognized.');
    }
    if (row.ruleId !== undefined && row.ruleId !== null) {
      validateId(row.ruleId, `${path}.ruleId`, issues);
    }
    validateAuditFields(row, path, issues);
  });
}

function validateBudgetRuleRows(rows: unknown[], issues: ValidationIssues): void {
  rows.forEach((value, index) => {
    const path = `data.budgetRules[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.id, `${path}.id`, issues);
    validateId(row.categoryId, `${path}.categoryId`, issues);
    validateSafeInteger(row.limitAmount, `${path}.limitAmount`, issues, { positive: true });
    if (
      row.color !== undefined &&
      row.color !== null &&
      (typeof row.color !== 'string' || !budgetColorKeys.includes(row.color as BudgetColorKey))
    ) {
      issue(issues, 'invalid_value', `${path}.color`, 'Budget color is not recognized.');
    }
    if (typeof row.startMonth !== 'string' || !monthPattern.test(row.startMonth)) {
      issue(issues, 'invalid_value', `${path}.startMonth`, 'Budget rule start month must use YYYY-MM.');
    }
    if (typeof row.isActive !== 'boolean') {
      issue(issues, 'invalid_value', `${path}.isActive`, 'Budget rule isActive must be a boolean.');
    }
    validateAuditFields(row, path, issues);
  });
}

function validateMonthlyBudgetRows(rows: unknown[], issues: ValidationIssues): void {
  rows.forEach((value, index) => {
    const path = `data.monthlyBudgets[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.id, `${path}.id`, issues);
    if (typeof row.month !== 'string' || !monthPattern.test(row.month)) {
      issue(issues, 'invalid_value', `${path}.month`, 'Monthly ceiling month must use YYYY-MM.');
    }
    // Positive even for an inactive row: the tombstone keeps the last known
    // limit as its payload, and the database CHECK requires it.
    validateSafeInteger(row.limitAmount, `${path}.limitAmount`, issues, { positive: true });
    if (typeof row.isActive !== 'boolean') {
      issue(issues, 'invalid_value', `${path}.isActive`, 'Monthly ceiling isActive must be a boolean.');
    }
    validateAuditFields(row, path, issues);
  });
}

function validateRecurringRows(rows: unknown[], issues: ValidationIssues, version: BackupFormatVersion = 1): void {
  rows.forEach((value, index) => {
    const path = `data.recurringTransactions[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.id, `${path}.id`, issues);
    validateEnum(row.type, ['income', 'expense', 'transfer'], `${path}.type`, issues);
    validateSafeInteger(row.amount, `${path}.amount`, issues, { positive: true });
    validateCurrency(row.currency, `${path}.currency`, issues, version);
    validateId(row.accountId, `${path}.accountId`, issues);
    validateNullableString(row.destinationAccountId, `${path}.destinationAccountId`, issues, backupLimits.maxIdLength);
    validateNullableString(row.categoryId, `${path}.categoryId`, issues, backupLimits.maxIdLength);
    if (version >= 6) {
      validateNullableString(row.subcategoryId, `${path}.subcategoryId`, issues, backupLimits.maxIdLength);
    }
    validateNullableString(row.note, `${path}.note`, issues, backupLimits.maxNoteLength);
    validateEnum(row.frequency, ['daily', 'weekly', 'monthly', 'yearly'], `${path}.frequency`, issues);
    validateSafeInteger(row.interval, `${path}.interval`, issues, { positive: true });
    validateCalendarDate(row.startDate, `${path}.startDate`, issues);
    validateCalendarDate(row.nextOccurrenceDate, `${path}.nextOccurrenceDate`, issues);
    validateNullableCalendarDate(row.endDate, `${path}.endDate`, issues);
    validateBoolean(row.isActive, `${path}.isActive`, issues);
    validateNullableUtcTimestamp(row.endedAt, `${path}.endedAt`, issues);
    validateAuditFields(row, path, issues);
    validateTransactionShape(row, path, issues, false, version >= 6);
    if (typeof row.startDate === 'string' && typeof row.endDate === 'string' && row.endDate < row.startDate) {
      issue(issues, 'domain_mismatch', `${path}.endDate`, 'Recurring end date cannot be earlier than its start date.');
    }
    if (row.endedAt !== null && row.isActive === true) {
      issue(issues, 'domain_mismatch', `${path}.isActive`, 'An ended recurring rule cannot be active.');
    }
  });
}

function validateOccurrenceRows(rows: unknown[], issues: ValidationIssues, version: BackupFormatVersion = 1): void {
  rows.forEach((value, index) => {
    const path = `data.recurringOccurrences[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.id, `${path}.id`, issues);
    validateId(row.recurringTransactionId, `${path}.recurringTransactionId`, issues);
    validateCalendarDate(row.scheduledDate, `${path}.scheduledDate`, issues);
    validateEnum(row.status, ['pending', 'posted', 'skipped'], `${path}.status`, issues);
    validateEnum(row.type, ['income', 'expense', 'transfer'], `${path}.type`, issues);
    validateSafeInteger(row.amount, `${path}.amount`, issues, { positive: true });
    validateCurrency(row.currency, `${path}.currency`, issues, version);
    validateId(row.accountId, `${path}.accountId`, issues);
    validateNullableString(row.destinationAccountId, `${path}.destinationAccountId`, issues, backupLimits.maxIdLength);
    validateNullableString(row.categoryId, `${path}.categoryId`, issues, backupLimits.maxIdLength);
    if (version >= 6) {
      validateNullableString(row.subcategoryId, `${path}.subcategoryId`, issues, backupLimits.maxIdLength);
    }
    validateNullableString(row.note, `${path}.note`, issues, backupLimits.maxNoteLength);
    validateNullableString(row.transactionId, `${path}.transactionId`, issues, backupLimits.maxIdLength);
    validateAuditFields(row, path, issues);
    validateTransactionShape(row, path, issues, false, version >= 6);
    if (row.status === 'posted' && (typeof row.transactionId !== 'string' || !row.transactionId)) {
      issue(issues, 'domain_mismatch', `${path}.transactionId`, 'A posted occurrence must link to a transaction.');
    }
    if ((row.status === 'pending' || row.status === 'skipped') && row.transactionId !== null) {
      issue(issues, 'domain_mismatch', `${path}.transactionId`, 'Only posted occurrences may link to a transaction.');
    }
  });
}

function measureJsonNesting(value: string): number {
  let depth = 0;
  let maximum = 0;
  let inString = false;
  let escaped = false;
  for (const character of value) {
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === '{' || character === '[') {
      depth += 1;
      maximum = Math.max(maximum, depth);
    } else if (character === '}' || character === ']') depth -= 1;
  }
  return maximum;
}

function validateUniqueIds(
  rows: { id: string }[],
  collection: string,
  issues: ValidationIssues,
): void {
  const ids = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.id)) {
      issue(issues, 'duplicate_id', `data.${collection}`, `${collection} contains duplicate ID ${row.id}.`);
    }
    ids.add(row.id);
  }
}

function normalizedName(value: string): string {
  return value.trim().toLocaleLowerCase('es-CO');
}

function validateSummaryAndRange(file: BackupFile, issues: ValidationIssues): void {
  const expected = {
    accounts: file.data.accounts.length,
    categories: file.data.categories.length,
    transactions: file.data.transactions.length,
    transactionSplits: file.data.transactionSplits.length,
    budgets: file.data.budgets.length,
    recurringRules: file.data.recurringTransactions.length,
    recurringOccurrences: file.data.recurringOccurrences.length,
  };
  const expectedWithCards = 'creditCardStatements' in file.data
    ? { ...expected, creditCardStatements: file.data.creditCardStatements.length }
    : expected;
  const expectedWithInvestments = 'investmentAccounts' in file.data
    ? {
        ...expectedWithCards,
        investmentAccounts: file.data.investmentAccounts.length,
        investmentValuations: file.data.investmentValuations.length,
      }
    : expectedWithCards;
  for (const [key, count] of Object.entries(expectedWithInvestments)) {
    if ((file.summary as Record<string, number>)[key] !== count) {
      issue(issues, 'domain_mismatch', `summary.${key}`, `Backup summary count for ${key} does not match its data.`);
    }
  }
  const dates = file.data.transactions.map((transaction) => transaction.transactionDate).sort();
  const oldest = dates[0] ?? null;
  const newest = dates.at(-1) ?? null;
  if (
    file.transactionDateRange.oldest !== oldest
    || file.transactionDateRange.newest !== newest
  ) {
    issue(issues, 'domain_mismatch', 'transactionDateRange', 'Backup transaction date range does not match its transactions.');
  }
}

export class BackupValidator {
  parseEnvelope(text: string, declaredFileSize: number): ParsedBackupEnvelope {
    const issues: ValidationIssues = [];
    const actualSize = Math.max(declaredFileSize, utf8ByteLength(text));
    if (actualSize > backupLimits.maxFileBytes) {
      issue(issues, 'file_too_large', '$', 'The selected backup is larger than the 25 MiB safety limit.');
    }
    if (measureJsonNesting(text) > backupLimits.maxNestingDepth) {
      issue(issues, 'nesting_too_deep', '$', 'The selected file is nested too deeply to be a Money Control backup.');
    }
    if (issues.length) throw new BackupValidationError(issues);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      throw new BackupValidationError([{
        code: 'invalid_json',
        path: '$',
        message: 'The selected file is not valid JSON.',
      }]);
    }
    const raw = requireRecord(parsed, '$', issues);
    if (!raw) throw new BackupValidationError(issues);
    if (raw.format !== BACKUP_FORMAT) {
      issue(issues, 'wrong_format', 'format', 'This file is not a Money Control backup.');
    }
    if (!Number.isSafeInteger(raw.formatVersion) || (raw.formatVersion as number) < 1) {
      issue(issues, 'invalid_structure', 'formatVersion', 'Backup format version must be a positive integer.');
    }
    if (issues.length) throw new BackupValidationError(issues);
    return { raw, formatVersion: raw.formatVersion as number };
  }

  validateV1(raw: Record<string, unknown>): BackupFileV1 {
    return this.validateVersion(raw, 1) as BackupFileV1;
  }

  validateV2(raw: Record<string, unknown>): BackupFileV2 {
    return this.validateVersion(raw, 2) as BackupFileV2;
  }

  validateV3(raw: Record<string, unknown>): BackupFileV3 {
    return this.validateVersion(raw, 3) as BackupFileV3;
  }

  validateV4(raw: Record<string, unknown>): BackupFileV4 {
    return this.validateVersion(raw, 4) as BackupFileV4;
  }

  validateV5(raw: Record<string, unknown>): BackupFileV5 {
    return this.validateVersion(raw, 5) as BackupFileV5;
  }

  validateV6(raw: Record<string, unknown>): BackupFileV6 {
    return this.validateVersion(raw, 6) as BackupFileV6;
  }

  validateV7(raw: Record<string, unknown>): BackupFileV7 {
    return this.validateVersion(raw, 7) as BackupFileV7;
  }

  private validateVersion(raw: Record<string, unknown>, version: BackupFormatVersion): BackupFile {
    const issues: ValidationIssues = [];
    if (raw.formatVersion !== version) {
      issue(issues, 'invalid_value', 'formatVersion', `Backup format version must be ${version}.`);
    }
    validateString(raw.appVersion, 'appVersion', issues, { nonBlank: true });
    validateUtcTimestamp(raw.createdAt, 'createdAt', issues);
    if (raw.timezone !== BACKUP_TIMEZONE) {
      issue(issues, 'domain_mismatch', 'timezone', `Backup timezone must be ${BACKUP_TIMEZONE}.`);
    }
    validateCurrency(raw.currency, 'currency', issues, version);
    validateString(raw.schemaVersion, 'schemaVersion', issues, { nonBlank: true });

    const summary = requireRecord(raw.summary, 'summary', issues);
    if (summary) {
      const keys = ['accounts', 'categories', 'transactions', 'transactionSplits', 'budgets', 'recurringRules', 'recurringOccurrences'];
      if (version >= 2) keys.push('creditCardStatements');
      if (version >= 5) keys.push('investmentAccounts', 'investmentValuations');
      for (const key of keys) {
        validateSafeInteger(summary[key], `summary.${key}`, issues, { nonNegative: true });
      }
    }
    const range = requireRecord(raw.transactionDateRange, 'transactionDateRange', issues);
    if (range) {
      validateNullableCalendarDate(range.oldest, 'transactionDateRange.oldest', issues);
      validateNullableCalendarDate(range.newest, 'transactionDateRange.newest', issues);
      if (typeof range.oldest === 'string' && typeof range.newest === 'string' && range.newest < range.oldest) {
        issue(issues, 'domain_mismatch', 'transactionDateRange', 'Backup transaction date range is reversed.');
      }
    }
    const integrity = requireRecord(raw.integrity, 'integrity', issues);
    if (integrity) {
      if (integrity.algorithm !== BACKUP_CHECKSUM_ALGORITHM) {
        issue(issues, 'invalid_value', 'integrity.algorithm', `Backup checksum algorithm must be ${BACKUP_CHECKSUM_ALGORITHM}.`);
      }
      if (typeof integrity.checksum !== 'string' || !checksumPattern.test(integrity.checksum)) {
        issue(issues, 'invalid_value', 'integrity.checksum', 'Backup checksum is missing or invalid.');
      }
    }

    const data = requireRecord(raw.data, 'data', issues);
    if (data) {
      // Every file before v7 was written by an app whose base currency could only
      // be COP; from v7 the file states it, and every per-row currency rule is
      // measured against it.
      let baseCurrency = 'COP';
      if (version >= 7) {
        validateCurrency(data.baseCurrencyCode, 'data.baseCurrencyCode', issues, version);
        if (typeof data.baseCurrencyCode === 'string') baseCurrency = data.baseCurrencyCode;
        const exchangeRates = requireArray(
          data, 'exchangeRates', 'data.exchangeRates', backupLimits.collections.accounts, issues,
        );
        validateExchangeRateRows(exchangeRates, issues, version);
      }
      const accounts = requireArray(data, 'accounts', 'data.accounts', backupLimits.collections.accounts, issues);
      const categories = requireArray(data, 'categories', 'data.categories', backupLimits.collections.categories, issues);
      const transactions = requireArray(data, 'transactions', 'data.transactions', backupLimits.collections.transactions, issues);
      const splits = requireArray(data, 'transactionSplits', 'data.transactionSplits', backupLimits.collections.transactionSplits, issues);
      const budgets = requireArray(data, 'budgets', 'data.budgets', backupLimits.collections.budgets, issues);
      const recurring = requireArray(data, 'recurringTransactions', 'data.recurringTransactions', backupLimits.collections.recurringTransactions, issues);
      const occurrences = requireArray(data, 'recurringOccurrences', 'data.recurringOccurrences', backupLimits.collections.recurringOccurrences, issues);
      const cardStatements = version >= 2
        ? requireArray(data, 'creditCardStatements', 'data.creditCardStatements', backupLimits.collections.creditCardStatements, issues)
        : [];
      validateAccountRows(accounts, issues, version);
      validateCategoryRows(categories, issues, version);
      validateTransactionRows(transactions, issues, version, baseCurrency);
      validateSplitRows(splits, issues);
      validateBudgetRows(budgets, issues);
      if (data.budgetRules !== undefined) {
        const budgetRules = requireArray(data, 'budgetRules', 'data.budgetRules', backupLimits.collections.budgetRules, issues);
        validateBudgetRuleRows(budgetRules, issues);
      }
      if (data.monthlyBudgets !== undefined) {
        const monthlyBudgets = requireArray(data, 'monthlyBudgets', 'data.monthlyBudgets', backupLimits.collections.monthlyBudgets, issues);
        validateMonthlyBudgetRows(monthlyBudgets, issues);
      }
      validateRecurringRows(recurring, issues, version);
      validateOccurrenceRows(occurrences, issues, version);
      if (version >= 2) validateCreditCardStatementRows(cardStatements, issues);
      if (version >= 5) {
        const investmentAccounts = requireArray(data, 'investmentAccounts', 'data.investmentAccounts', backupLimits.collections.investmentAccounts, issues);
        const investmentValuations = requireArray(data, 'investmentValuations', 'data.investmentValuations', backupLimits.collections.investmentValuations, issues);
        validateInvestmentAccountRows(investmentAccounts, issues);
        validateInvestmentValuationRows(investmentValuations, issues, version);
      }
    }
    if (issues.length) throw new BackupValidationError(issues);
    return raw as unknown as BackupFile;
  }

  validateRelationships(file: BackupFile): void {
    const issues: ValidationIssues = [];
    const { data } = file;
    validateUniqueIds(data.accounts, 'accounts', issues);
    validateUniqueIds(data.categories, 'categories', issues);
    validateUniqueIds(data.transactions, 'transactions', issues);
    validateUniqueIds(data.transactionSplits, 'transactionSplits', issues);
    validateUniqueIds(data.budgets, 'budgets', issues);
    if ('budgetRules' in data && Array.isArray((data as { budgetRules?: unknown[] }).budgetRules)) {
      validateUniqueIds((data as { budgetRules: { id: string }[] }).budgetRules, 'budgetRules', issues);
    }
    if ('monthlyBudgets' in data && Array.isArray((data as { monthlyBudgets?: unknown[] }).monthlyBudgets)) {
      validateUniqueIds((data as { monthlyBudgets: { id: string }[] }).monthlyBudgets, 'monthlyBudgets', issues);
    }
    validateUniqueIds(data.recurringTransactions, 'recurringTransactions', issues);
    validateUniqueIds(data.recurringOccurrences, 'recurringOccurrences', issues);
    if ('creditCardStatements' in file.data) {
      validateUniqueIds(file.data.creditCardStatements, 'creditCardStatements', issues);
    }

    const accountIds = new Set(data.accounts.map((row) => row.id));
    const categories = new Map(data.categories.map((row) => [row.id, row]));
    const transactionIds = new Set(data.transactions.map((row) => row.id));
    const recurringIds = new Set(data.recurringTransactions.map((row) => row.id));

    if ('creditCardStatements' in file.data) {
      const statementKeys = new Set<string>();
      for (const statement of file.data.creditCardStatements) {
        const account = file.data.accounts.find((candidate) => candidate.id === statement.accountId);
        if (!account) {
          issue(issues, 'missing_reference', 'data.creditCardStatements', `Statement ${statement.id} references a missing account.`);
        } else if (account.type !== 'credit_card') {
          issue(issues, 'domain_mismatch', 'data.creditCardStatements', `Statement ${statement.id} must reference a credit card.`);
        }
        const key = `${statement.accountId}:${statement.closingDate}`;
        if (statementKeys.has(key)) {
          issue(issues, 'duplicate_constraint', 'data.creditCardStatements', 'Two statements use the same card and closing date.');
        }
        statementKeys.add(key);
      }
    }

    const activeAccountNames = new Set<string>();
    for (const account of data.accounts) {
      if (account.isArchived) continue;
      const key = normalizedName(account.name);
      if (activeAccountNames.has(key)) {
        issue(issues, 'duplicate_constraint', 'data.accounts', 'Active account names must be unique after trimming and case folding.');
      }
      activeAccountNames.add(key);
    }
    // Name uniqueness is scoped to the parent from v6 on, matching
    // categories_active_scope_name_uidx. Legacy files have no parents, so the
    // empty scope reproduces the old type-only rule exactly.
    const activeCategoryNames = new Set<string>();
    for (const category of data.categories) {
      if (category.isArchived) continue;
      const scope = 'parentCategoryId' in category ? category.parentCategoryId ?? '' : '';
      const key = `${category.type}:${scope}:${normalizedName(category.name)}`;
      if (activeCategoryNames.has(key)) {
        issue(issues, 'duplicate_constraint', 'data.categories', scope
          ? 'A parent category has two active subcategories with the same name.'
          : 'Active category names must be unique within their type.');
      }
      activeCategoryNames.add(key);
    }

    this.validateCategoryHierarchy(file, issues);

    for (const transaction of data.transactions) {
      this.validateAccountReference(accountIds, transaction.accountId, 'transaction', transaction.id, issues);
      if (transaction.destinationAccountId) {
        this.validateAccountReference(accountIds, transaction.destinationAccountId, 'transaction destination', transaction.id, issues);
      }
      if (transaction.categoryId) {
        this.validateCategoryReference(categories, transaction.categoryId, transaction.type, 'transaction', transaction.id, issues);
      }
      this.validateSubcategoryPair(file, transaction, 'transaction', issues);
    }
    for (const rule of data.recurringTransactions) {
      this.validateSubcategoryPair(file, rule, 'recurring rule', issues);
    }
    for (const occurrence of data.recurringOccurrences) {
      this.validateSubcategoryPair(file, occurrence, 'recurring occurrence', issues);
    }

    if (supportsRefunds(file)) {
      const transactionsById = new Map(file.data.transactions.map((row) => [row.id, row]));
      const postedRefundTotals = new Map<string, number>();
      for (const transaction of file.data.transactions) {
        if (transaction.type !== 'refund') continue;
        const originalId = transaction.originalTransactionId;
        const original = originalId ? transactionsById.get(originalId) : undefined;
        if (!original) {
          issue(issues, 'missing_reference', 'data.transactions', `Refund ${transaction.id} references a missing original transaction.`);
          continue;
        }
        if (original.type !== 'expense') {
          issue(issues, 'domain_mismatch', 'data.transactions', `Refund ${transaction.id} must reference an expense.`);
        }
        if (transaction.status === 'posted' && original.status !== 'posted') {
          issue(issues, 'domain_mismatch', 'data.transactions', `Posted refund ${transaction.id} must reference a posted expense.`);
        }
        if (original.accountId !== transaction.accountId) {
          issue(issues, 'domain_mismatch', 'data.transactions', `Refund ${transaction.id} must use the original expense account.`);
        }
        if (transaction.transactionDate < original.transactionDate) {
          issue(issues, 'domain_mismatch', 'data.transactions', `Refund ${transaction.id} is dated before its original expense.`);
        }
        if (transaction.amount > original.amount) {
          issue(issues, 'domain_mismatch', 'data.transactions', `Refund ${transaction.id} exceeds its original expense.`);
        }
        if (transaction.status === 'posted') {
          const next = (postedRefundTotals.get(original.id) ?? 0) + transaction.amount;
          if (!Number.isSafeInteger(next) || next > original.amount) {
            issue(issues, 'domain_mismatch', 'data.transactions', `Posted refunds exceed expense ${original.id}.`);
          }
          postedRefundTotals.set(original.id, next);
        }
      }
    }

    const splitPositions = new Set<string>();
    const splitAccounts = new Set<string>();
    for (const split of data.transactionSplits) {
      if (!transactionIds.has(split.transactionId)) {
        issue(issues, 'missing_reference', 'data.transactionSplits', `Split ${split.id} references a missing transaction.`);
      }
      this.validateAccountReference(accountIds, split.accountId, 'split', split.id, issues);
      const positionKey = `${split.transactionId}:${split.position}`;
      const accountKey = `${split.transactionId}:${split.accountId}`;
      if (splitPositions.has(positionKey) || splitAccounts.has(accountKey)) {
        issue(issues, 'duplicate_constraint', 'data.transactionSplits', 'Transaction split position/account uniqueness would be violated.');
      }
      splitPositions.add(positionKey);
      splitAccounts.add(accountKey);
    }

    const budgetKeys = new Set<string>();
    for (const budget of data.budgets) {
      const category = categories.get(budget.categoryId);
      if (!category) {
        issue(issues, 'missing_reference', 'data.budgets', `Budget ${budget.id} references a missing category.`);
      } else if (category.type !== 'expense') {
        issue(issues, 'domain_mismatch', 'data.budgets', `Budget ${budget.id} must reference an expense category.`);
      }
      const key = `${budget.categoryId}:${budget.month}`;
      if (budgetKeys.has(key)) {
        issue(issues, 'duplicate_constraint', 'data.budgets', 'Two budgets use the same category and month.');
      }
      budgetKeys.add(key);
    }

    const monthlyBudgets = (data as { monthlyBudgets?: BackupMonthlyBudget[] }).monthlyBudgets ?? [];
    const ceilingMonths = new Set<string>();
    for (const ceiling of monthlyBudgets) {
      if (ceilingMonths.has(ceiling.month)) {
        issue(issues, 'duplicate_constraint', 'data.monthlyBudgets', 'Two monthly ceilings use the same month.');
      }
      ceilingMonths.add(ceiling.month);
    }

    const budgetRules = (data as { budgetRules?: BackupBudgetRule[] }).budgetRules ?? [];
    const ruleIds = new Set(budgetRules.map((rule) => rule.id));
    const activeRuleCategories = new Set<string>();
    for (const rule of budgetRules) {
      const category = categories.get(rule.categoryId);
      if (!category) {
        issue(issues, 'missing_reference', 'data.budgetRules', `Budget rule ${rule.id} references a missing category.`);
      } else if (category.type !== 'expense') {
        issue(issues, 'domain_mismatch', 'data.budgetRules', `Budget rule ${rule.id} must reference an expense category.`);
      }
      if (rule.isActive) {
        if (activeRuleCategories.has(rule.categoryId)) {
          issue(issues, 'duplicate_constraint', 'data.budgetRules', 'Two active budget rules use the same category.');
        }
        activeRuleCategories.add(rule.categoryId);
      }
    }
    for (const budget of data.budgets) {
      if (budget.ruleId != null && !ruleIds.has(budget.ruleId)) {
        issue(issues, 'missing_reference', 'data.budgets', `Budget ${budget.id} references a missing budget rule.`);
      }
    }

    for (const recurring of data.recurringTransactions) {
      this.validateAccountReference(accountIds, recurring.accountId, 'recurring rule', recurring.id, issues);
      if (recurring.destinationAccountId) {
        this.validateAccountReference(accountIds, recurring.destinationAccountId, 'recurring destination', recurring.id, issues);
      }
      if (recurring.categoryId) {
        this.validateCategoryReference(categories, recurring.categoryId, recurring.type, 'recurring rule', recurring.id, issues);
      }
    }

    const occurrenceKeys = new Set<string>();
    const postedTransactions = new Set<string>();
    for (const occurrence of data.recurringOccurrences) {
      if (!recurringIds.has(occurrence.recurringTransactionId)) {
        issue(issues, 'missing_reference', 'data.recurringOccurrences', `Occurrence ${occurrence.id} references a missing recurring rule.`);
      }
      this.validateAccountReference(accountIds, occurrence.accountId, 'recurring occurrence', occurrence.id, issues);
      if (occurrence.destinationAccountId) {
        this.validateAccountReference(accountIds, occurrence.destinationAccountId, 'occurrence destination', occurrence.id, issues);
      }
      if (occurrence.categoryId) {
        this.validateCategoryReference(categories, occurrence.categoryId, occurrence.type, 'recurring occurrence', occurrence.id, issues);
      }
      if (occurrence.transactionId) {
        if (!transactionIds.has(occurrence.transactionId)) {
          issue(issues, 'missing_reference', 'data.recurringOccurrences', `Posted occurrence ${occurrence.id} references a missing transaction.`);
        }
        if (postedTransactions.has(occurrence.transactionId)) {
          issue(issues, 'duplicate_constraint', 'data.recurringOccurrences', 'Two recurring occurrences reference the same posted transaction.');
        }
        postedTransactions.add(occurrence.transactionId);
      }
      const key = `${occurrence.recurringTransactionId}:${occurrence.scheduledDate}`;
      if (occurrenceKeys.has(key)) {
        issue(issues, 'duplicate_constraint', 'data.recurringOccurrences', 'Two occurrences use the same recurring rule and scheduled date.');
      }
      occurrenceKeys.add(key);
    }

    if ('investmentAccounts' in file.data) {
      const { investmentAccounts, investmentValuations, accounts } = file.data;
      validateUniqueIds(investmentValuations, 'investmentValuations', issues);
      const accountsById = new Map(accounts.map((account) => [account.id, account]));
      const metadataAccountIds = new Set<string>();
      for (const meta of investmentAccounts) {
        if (metadataAccountIds.has(meta.accountId)) {
          issue(issues, 'duplicate_constraint', 'data.investmentAccounts', 'Two investment metadata rows reference the same account.');
        }
        metadataAccountIds.add(meta.accountId);
        const account = accountsById.get(meta.accountId);
        if (!account) {
          issue(issues, 'missing_reference', 'data.investmentAccounts', `Investment metadata ${meta.accountId} references a missing account.`);
        } else if (account.type !== 'investment') {
          issue(issues, 'domain_mismatch', 'data.investmentAccounts', `Investment metadata ${meta.accountId} must reference an investment account.`);
        }
      }
      // Every investment account must have exactly one metadata row (no orphans).
      for (const account of accounts) {
        if (account.type === 'investment' && !metadataAccountIds.has(account.id)) {
          issue(issues, 'missing_reference', 'data.investmentAccounts', `Investment account ${account.id} has no investment metadata.`);
        }
      }
      const valuationKeys = new Set<string>();
      for (const valuation of investmentValuations) {
        const account = accountsById.get(valuation.investmentAccountId);
        if (!account) {
          issue(issues, 'missing_reference', 'data.investmentValuations', `Valuation ${valuation.id} references a missing account.`);
        } else if (account.type !== 'investment') {
          issue(issues, 'domain_mismatch', 'data.investmentValuations', `Valuation ${valuation.id} must reference an investment account.`);
        } else if (valuation.currencyCode !== account.currency) {
          issue(issues, 'domain_mismatch', 'data.investmentValuations', `Valuation ${valuation.id} currency must match its account currency.`);
        }
        const key = `${valuation.investmentAccountId}:${valuation.valuationDate}`;
        if (valuationKeys.has(key)) {
          issue(issues, 'duplicate_constraint', 'data.investmentValuations', 'Two valuations use the same account and date.');
        }
        valuationKeys.add(key);
      }
    }

    validateSummaryAndRange(file, issues);
    if (issues.length) throw new BackupValidationError(issues);
  }

  checksumMismatch(): BackupValidationError {
    return new BackupValidationError([{
      code: 'checksum_mismatch',
      path: 'integrity.checksum',
      message: 'The backup checksum does not match. The file may be damaged or modified.',
    }]);
  }

  private validateAccountReference(
    accountIds: Set<string>,
    accountId: string,
    source: string,
    sourceId: string,
    issues: ValidationIssues,
  ): void {
    if (!accountIds.has(accountId)) {
      issue(issues, 'missing_reference', 'data', `${source} ${sourceId} references a missing account.`);
    }
  }

  /**
   * Two-level hierarchy checks for a v6 payload.
   *
   * The depth rule doubles as the cycle guard: every parent must itself be
   * top-level, so no chain longer than two links can form, and a cycle of any
   * length would require some member to have both a parent and a child. Nothing
   * has to walk the graph.
   */
  private validateCategoryHierarchy(file: BackupFile, issues: ValidationIssues): void {
    if (!supportsCategoryHierarchy(file)) return;
    const categories = new Map(file.data.categories.map((row) => [row.id, row]));
    for (const category of file.data.categories) {
      const parentId = category.parentCategoryId;
      if (parentId === null) continue;
      if (parentId === category.id) {
        issue(issues, 'domain_mismatch', 'data.categories', `Category ${category.id} is its own parent.`);
        continue;
      }
      const parent = categories.get(parentId);
      if (!parent) {
        issue(issues, 'missing_reference', 'data.categories', `Category ${category.id} references a missing parent.`);
        continue;
      }
      if (parent.parentCategoryId !== null) {
        issue(issues, 'domain_mismatch', 'data.categories', `Category ${category.id} nests more than two levels.`);
      }
      if (parent.type !== category.type) {
        issue(issues, 'domain_mismatch', 'data.categories', `Category ${category.id} does not match its parent type.`);
      }
      // An active subcategory under an archived parent is a state no picker can
      // represent, and archiving cascades, so it cannot arise from normal use.
      if (!category.isArchived && parent.isArchived) {
        issue(issues, 'domain_mismatch', 'data.categories', `Category ${category.id} is active under an archived parent.`);
      }
    }
  }

  /** The stored (category, subcategory) pair must actually belong together. */
  private validateSubcategoryPair(
    file: BackupFile,
    row: { id: string; categoryId: string | null; subcategoryId?: string | null },
    source: string,
    issues: ValidationIssues,
  ): void {
    if (!supportsCategoryHierarchy(file)) return;
    const subcategoryId = row.subcategoryId ?? null;
    if (subcategoryId === null) return;
    const subcategory = file.data.categories.find((category) => category.id === subcategoryId);
    if (!subcategory) {
      issue(issues, 'missing_reference', 'data', `${source} ${row.id} references a missing subcategory.`);
      return;
    }
    if (subcategory.parentCategoryId !== row.categoryId) {
      issue(issues, 'domain_mismatch', 'data', `${source} ${row.id} has a subcategory from another category.`);
    }
  }

  private validateCategoryReference(
    categories: Map<string, { type: 'expense' | 'income' }>,
    categoryId: string,
    expectedType: 'income' | 'expense' | 'transfer' | 'refund',
    source: string,
    sourceId: string,
    issues: ValidationIssues,
  ): void {
    const category = categories.get(categoryId);
    if (!category) {
      issue(issues, 'missing_reference', 'data', `${source} ${sourceId} references a missing category.`);
    } else if (
      expectedType === 'transfer'
      || expectedType === 'refund'
      || category.type !== expectedType
    ) {
      issue(issues, 'domain_mismatch', 'data', `${source} ${sourceId} has an incompatible category type.`);
    }
  }
}
