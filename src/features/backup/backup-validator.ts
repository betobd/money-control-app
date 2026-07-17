import { backupLimits, utf8ByteLength } from './backup-limits';
import {
  BACKUP_CHECKSUM_ALGORITHM,
  BACKUP_CURRENCY,
  BACKUP_FORMAT,
  BACKUP_TIMEZONE,
  type BackupFileV1,
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

function validateCurrency(value: unknown, path: string, issues: ValidationIssues): void {
  if (value !== BACKUP_CURRENCY) {
    issue(issues, 'domain_mismatch', path, `${path} must be COP.`);
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

function validateTransactionShape(row: Record<string, unknown>, path: string, issues: ValidationIssues): void {
  const type = row.type;
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
  }
}

function validateAccountRows(rows: unknown[], issues: ValidationIssues): void {
  rows.forEach((value, index) => {
    const path = `data.accounts[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.id, `${path}.id`, issues);
    validateString(row.name, `${path}.name`, issues, { nonBlank: true });
    validateEnum(row.type, ['checking', 'savings', 'credit_card', 'cash', 'other'], `${path}.type`, issues);
    validateCurrency(row.currency, `${path}.currency`, issues);
    validateSafeInteger(row.openingBalance, `${path}.openingBalance`, issues);
    if (row.creditLimit !== null) {
      validateSafeInteger(row.creditLimit, `${path}.creditLimit`, issues, { nonNegative: true });
      if (row.type !== 'credit_card') {
        issue(issues, 'domain_mismatch', `${path}.creditLimit`, 'Only credit cards may have a credit limit.');
      }
    }
    validateArchiveFields(row, path, issues);
    validateAuditFields(row, path, issues);
  });
}

function validateCategoryRows(rows: unknown[], issues: ValidationIssues): void {
  rows.forEach((value, index) => {
    const path = `data.categories[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.id, `${path}.id`, issues);
    validateString(row.name, `${path}.name`, issues, { nonBlank: true });
    validateEnum(row.type, ['expense', 'income'], `${path}.type`, issues);
    validateNullableString(row.icon, `${path}.icon`, issues);
    validateArchiveFields(row, path, issues);
    validateAuditFields(row, path, issues);
  });
}

function validateTransactionRows(rows: unknown[], issues: ValidationIssues): void {
  rows.forEach((value, index) => {
    const path = `data.transactions[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.id, `${path}.id`, issues);
    validateEnum(row.type, ['income', 'expense', 'transfer'], `${path}.type`, issues);
    validateEnum(row.status, ['posted', 'voided'], `${path}.status`, issues);
    validateSafeInteger(row.amount, `${path}.amount`, issues, { positive: true });
    validateCurrency(row.currency, `${path}.currency`, issues);
    validateId(row.accountId, `${path}.accountId`, issues);
    validateNullableString(row.destinationAccountId, `${path}.destinationAccountId`, issues, backupLimits.maxIdLength);
    validateNullableString(row.categoryId, `${path}.categoryId`, issues, backupLimits.maxIdLength);
    validateNullableString(row.note, `${path}.note`, issues, backupLimits.maxNoteLength);
    validateCalendarDate(row.transactionDate, `${path}.transactionDate`, issues);
    validateAuditFields(row, path, issues);
    validateTransactionShape(row, path, issues);
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
    validateAuditFields(row, path, issues);
  });
}

function validateRecurringRows(rows: unknown[], issues: ValidationIssues): void {
  rows.forEach((value, index) => {
    const path = `data.recurringTransactions[${index}]`;
    const row = requireRecord(value, path, issues);
    if (!row) return;
    validateId(row.id, `${path}.id`, issues);
    validateEnum(row.type, ['income', 'expense', 'transfer'], `${path}.type`, issues);
    validateSafeInteger(row.amount, `${path}.amount`, issues, { positive: true });
    validateCurrency(row.currency, `${path}.currency`, issues);
    validateId(row.accountId, `${path}.accountId`, issues);
    validateNullableString(row.destinationAccountId, `${path}.destinationAccountId`, issues, backupLimits.maxIdLength);
    validateNullableString(row.categoryId, `${path}.categoryId`, issues, backupLimits.maxIdLength);
    validateNullableString(row.note, `${path}.note`, issues, backupLimits.maxNoteLength);
    validateEnum(row.frequency, ['daily', 'weekly', 'monthly', 'yearly'], `${path}.frequency`, issues);
    validateSafeInteger(row.interval, `${path}.interval`, issues, { positive: true });
    validateCalendarDate(row.startDate, `${path}.startDate`, issues);
    validateCalendarDate(row.nextOccurrenceDate, `${path}.nextOccurrenceDate`, issues);
    validateNullableCalendarDate(row.endDate, `${path}.endDate`, issues);
    validateBoolean(row.isActive, `${path}.isActive`, issues);
    validateNullableUtcTimestamp(row.endedAt, `${path}.endedAt`, issues);
    validateAuditFields(row, path, issues);
    validateTransactionShape(row, path, issues);
    if (typeof row.startDate === 'string' && typeof row.endDate === 'string' && row.endDate < row.startDate) {
      issue(issues, 'domain_mismatch', `${path}.endDate`, 'Recurring end date cannot be earlier than its start date.');
    }
    if (row.endedAt !== null && row.isActive === true) {
      issue(issues, 'domain_mismatch', `${path}.isActive`, 'An ended recurring rule cannot be active.');
    }
  });
}

function validateOccurrenceRows(rows: unknown[], issues: ValidationIssues): void {
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
    validateCurrency(row.currency, `${path}.currency`, issues);
    validateId(row.accountId, `${path}.accountId`, issues);
    validateNullableString(row.destinationAccountId, `${path}.destinationAccountId`, issues, backupLimits.maxIdLength);
    validateNullableString(row.categoryId, `${path}.categoryId`, issues, backupLimits.maxIdLength);
    validateNullableString(row.note, `${path}.note`, issues, backupLimits.maxNoteLength);
    validateNullableString(row.transactionId, `${path}.transactionId`, issues, backupLimits.maxIdLength);
    validateAuditFields(row, path, issues);
    validateTransactionShape(row, path, issues);
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

function validateSummaryAndRange(file: BackupFileV1, issues: ValidationIssues): void {
  const expected = {
    accounts: file.data.accounts.length,
    categories: file.data.categories.length,
    transactions: file.data.transactions.length,
    transactionSplits: file.data.transactionSplits.length,
    budgets: file.data.budgets.length,
    recurringRules: file.data.recurringTransactions.length,
    recurringOccurrences: file.data.recurringOccurrences.length,
  };
  for (const [key, count] of Object.entries(expected)) {
    if (file.summary[key as keyof typeof expected] !== count) {
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
    const issues: ValidationIssues = [];
    validateString(raw.appVersion, 'appVersion', issues, { nonBlank: true });
    validateUtcTimestamp(raw.createdAt, 'createdAt', issues);
    if (raw.timezone !== BACKUP_TIMEZONE) {
      issue(issues, 'domain_mismatch', 'timezone', `Backup timezone must be ${BACKUP_TIMEZONE}.`);
    }
    validateCurrency(raw.currency, 'currency', issues);
    validateString(raw.schemaVersion, 'schemaVersion', issues, { nonBlank: true });

    const summary = requireRecord(raw.summary, 'summary', issues);
    if (summary) {
      for (const key of ['accounts', 'categories', 'transactions', 'transactionSplits', 'budgets', 'recurringRules', 'recurringOccurrences']) {
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
      const accounts = requireArray(data, 'accounts', 'data.accounts', backupLimits.collections.accounts, issues);
      const categories = requireArray(data, 'categories', 'data.categories', backupLimits.collections.categories, issues);
      const transactions = requireArray(data, 'transactions', 'data.transactions', backupLimits.collections.transactions, issues);
      const splits = requireArray(data, 'transactionSplits', 'data.transactionSplits', backupLimits.collections.transactionSplits, issues);
      const budgets = requireArray(data, 'budgets', 'data.budgets', backupLimits.collections.budgets, issues);
      const recurring = requireArray(data, 'recurringTransactions', 'data.recurringTransactions', backupLimits.collections.recurringTransactions, issues);
      const occurrences = requireArray(data, 'recurringOccurrences', 'data.recurringOccurrences', backupLimits.collections.recurringOccurrences, issues);
      validateAccountRows(accounts, issues);
      validateCategoryRows(categories, issues);
      validateTransactionRows(transactions, issues);
      validateSplitRows(splits, issues);
      validateBudgetRows(budgets, issues);
      validateRecurringRows(recurring, issues);
      validateOccurrenceRows(occurrences, issues);
    }
    if (issues.length) throw new BackupValidationError(issues);
    return raw as unknown as BackupFileV1;
  }

  validateRelationships(file: BackupFileV1): void {
    const issues: ValidationIssues = [];
    const { data } = file;
    validateUniqueIds(data.accounts, 'accounts', issues);
    validateUniqueIds(data.categories, 'categories', issues);
    validateUniqueIds(data.transactions, 'transactions', issues);
    validateUniqueIds(data.transactionSplits, 'transactionSplits', issues);
    validateUniqueIds(data.budgets, 'budgets', issues);
    validateUniqueIds(data.recurringTransactions, 'recurringTransactions', issues);
    validateUniqueIds(data.recurringOccurrences, 'recurringOccurrences', issues);

    const accountIds = new Set(data.accounts.map((row) => row.id));
    const categories = new Map(data.categories.map((row) => [row.id, row]));
    const transactionIds = new Set(data.transactions.map((row) => row.id));
    const recurringIds = new Set(data.recurringTransactions.map((row) => row.id));

    const activeAccountNames = new Set<string>();
    for (const account of data.accounts) {
      if (account.isArchived) continue;
      const key = normalizedName(account.name);
      if (activeAccountNames.has(key)) {
        issue(issues, 'duplicate_constraint', 'data.accounts', 'Active account names must be unique after trimming and case folding.');
      }
      activeAccountNames.add(key);
    }
    const activeCategoryNames = new Set<string>();
    for (const category of data.categories) {
      if (category.isArchived) continue;
      const key = `${category.type}:${normalizedName(category.name)}`;
      if (activeCategoryNames.has(key)) {
        issue(issues, 'duplicate_constraint', 'data.categories', 'Active category names must be unique within their type.');
      }
      activeCategoryNames.add(key);
    }

    for (const transaction of data.transactions) {
      this.validateAccountReference(accountIds, transaction.accountId, 'transaction', transaction.id, issues);
      if (transaction.destinationAccountId) {
        this.validateAccountReference(accountIds, transaction.destinationAccountId, 'transaction destination', transaction.id, issues);
      }
      if (transaction.categoryId) {
        this.validateCategoryReference(categories, transaction.categoryId, transaction.type, 'transaction', transaction.id, issues);
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

  private validateCategoryReference(
    categories: Map<string, { type: 'expense' | 'income' }>,
    categoryId: string,
    expectedType: 'income' | 'expense' | 'transfer',
    source: string,
    sourceId: string,
    issues: ValidationIssues,
  ): void {
    const category = categories.get(categoryId);
    if (!category) {
      issue(issues, 'missing_reference', 'data', `${source} ${sourceId} references a missing category.`);
    } else if (expectedType === 'transfer' || category.type !== expectedType) {
      issue(issues, 'domain_mismatch', 'data', `${source} ${sourceId} has an incompatible category type.`);
    }
  }
}
