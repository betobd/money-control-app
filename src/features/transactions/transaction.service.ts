import type { Account, AccountWithBalance } from '@/features/accounts/account.types';
import type { AccountRepository } from '@/features/accounts/account.repository';
import type { Category } from '@/features/categories/category.types';
import type { CategoryRepository } from '@/features/categories/category.repository';
import { notifyFinancialDataChanged } from './financial-data-events';
import { isValidCalendarDate } from './transaction-date';
import type { TransactionRepository } from './transaction.repository';
import {
  supportedTransactionTypes,
  type NormalizedTransactionListQuery,
  type TransactionInput,
  type TransactionListQuery,
  type TransactionListItem,
  type TransactionRecord,
  type TransactionUpdateRecord,
  type TransactionValidationErrors,
} from './transaction.types';

const transactionStatuses = ['posted', 'voided'] as const;
const DEFAULT_LIST_LIMIT = 40;
const MAX_LIST_LIMIT = 100;

export class TransactionListQueryValidationError extends Error {}

export function normalizeTransactionListQuery(
  query: TransactionListQuery = {},
): NormalizedTransactionListQuery {
  const search = query.search?.trim() || undefined;
  const types = query.types ? [...new Set(query.types)] : undefined;
  const statuses = query.statuses ? [...new Set(query.statuses)] : undefined;
  if (types?.some((type) => !supportedTransactionTypes.includes(type))) {
    throw new TransactionListQueryValidationError('Unsupported transaction type filter.');
  }
  if (statuses?.some((status) => !transactionStatuses.includes(status))) {
    throw new TransactionListQueryValidationError('Unsupported transaction status filter.');
  }
  if (query.dateFrom && !isValidCalendarDate(query.dateFrom)) {
    throw new TransactionListQueryValidationError('Start date must use YYYY-MM-DD.');
  }
  if (query.dateTo && !isValidCalendarDate(query.dateTo)) {
    throw new TransactionListQueryValidationError('End date must use YYYY-MM-DD.');
  }
  if (query.dateFrom && query.dateTo && query.dateTo < query.dateFrom) {
    throw new TransactionListQueryValidationError('End date cannot be earlier than start date.');
  }
  const limit = query.limit ?? DEFAULT_LIST_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT) {
    throw new TransactionListQueryValidationError(`Page size must be between 1 and ${MAX_LIST_LIMIT}.`);
  }
  if (query.cursor) {
    if (
      !isValidCalendarDate(query.cursor.transactionDate)
      || !query.cursor.createdAt
      || !query.cursor.id
    ) {
      throw new TransactionListQueryValidationError('Invalid transaction page cursor.');
    }
  }

  return {
    search,
    types: types?.length ? types : undefined,
    statuses: statuses?.length ? statuses : undefined,
    accountId: query.accountId?.trim() || undefined,
    categoryId: query.categoryId?.trim() || undefined,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    limit,
    cursor: query.cursor,
  };
}

export class TransactionValidationError extends Error {
  constructor(public readonly fields: TransactionValidationErrors) {
    super('Transaction validation failed.');
  }
}

export type TransactionActionErrorCode =
  | 'transaction_not_found'
  | 'transaction_already_voided'
  | 'editing_voided_transaction';

export class TransactionActionError extends Error {
  constructor(
    public readonly code: TransactionActionErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export class TransactionService {
  constructor(
    private readonly repository: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly createId: () => string,
    private readonly now = () => new Date().toISOString(),
  ) {}

  list(query: TransactionListQuery = {}) {
    return this.repository.list(normalizeTransactionListQuery(query));
  }

  hasAny() {
    return this.repository.hasAny();
  }

  listFilterOptions() {
    return this.repository.listFilterOptions();
  }

  get(id: string) {
    return this.repository.findById(id);
  }

  recent(limit = 3) {
    return this.repository.recent(limit);
  }

  summarizeMonth(month: string) {
    return this.repository.summarizeMonth(month);
  }

  async create(input: TransactionInput): Promise<TransactionRecord> {
    const normalized = this.normalize(input);
    await this.validate(normalized);
    const timestamp = this.now();
    const metadata = {
      id: this.createId(),
      status: 'posted' as const,
      currency: 'COP' as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const transaction: TransactionRecord = normalized.type === 'transfer'
      ? { ...normalized, ...metadata, categoryId: null }
      : { ...normalized, ...metadata, destinationAccountId: null };

    await this.repository.create(transaction);
    notifyFinancialDataChanged();
    return transaction;
  }

  async update(id: string, input: TransactionInput): Promise<TransactionListItem> {
    const current = await this.requireTransaction(id);
    if (current.status === 'voided') {
      throw new TransactionActionError(
        'editing_voided_transaction',
        'Voided transactions cannot be edited.',
      );
    }

    const normalized = this.normalize(input);
    const errors: TransactionValidationErrors = {};
    if (normalized.type !== current.type) {
      errors.type = 'Transaction type cannot be changed.';
    }
    await this.validate(normalized, current, errors);

    const updatedAt = this.now();
    const update: TransactionUpdateRecord = {
      amount: normalized.amount,
      accountId: normalized.accountId,
      destinationAccountId: normalized.type === 'transfer' ? normalized.destinationAccountId : null,
      categoryId: normalized.type === 'transfer' ? null : normalized.categoryId,
      transactionDate: normalized.transactionDate,
      note: normalized.note,
      updatedAt,
    };
    if (!(await this.repository.updatePosted(id, update))) {
      await this.throwFailedWrite(id, 'edit');
    }
    const updated = await this.requireTransaction(id);
    notifyFinancialDataChanged();
    return updated;
  }

  async void(id: string): Promise<TransactionListItem> {
    const current = await this.requireTransaction(id);
    if (current.status === 'voided') {
      throw new TransactionActionError(
        'transaction_already_voided',
        'Transaction is already voided.',
      );
    }
    if (!(await this.repository.voidPosted(id, this.now()))) {
      await this.throwFailedWrite(id, 'void');
    }
    const voided = await this.requireTransaction(id);
    notifyFinancialDataChanged();
    return voided;
  }

  private normalize(input: TransactionInput): TransactionInput {
    return { ...input, note: input.note?.trim() || null };
  }

  private async validate(
    input: TransactionInput,
    original?: TransactionListItem,
    errors: TransactionValidationErrors = {},
  ): Promise<void> {
    if (!supportedTransactionTypes.includes(input.type)) {
      errors.type = 'Select a supported transaction type.';
    }
    if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
      errors.amount = 'Enter a positive whole COP amount.';
    }
    if (!isValidCalendarDate(input.transactionDate)) {
      errors.transactionDate = 'Enter a valid date in YYYY-MM-DD format.';
    }
    if (input.note && input.note.length > 200) {
      errors.note = 'Note must be 200 characters or fewer.';
    }

    if (input.type === 'transfer') {
      await this.validateTransfer(input, errors, original);
    } else {
      await this.validateCategorizedTransaction(input, errors, original);
    }
    if (Object.keys(errors).length > 0) throw new TransactionValidationError(errors);
  }

  private async validateCategorizedTransaction(
    input: Extract<TransactionInput, { type: 'expense' | 'income' }>,
    errors: TransactionValidationErrors,
    original?: TransactionListItem,
  ): Promise<void> {
    const account = input.accountId ? await this.accounts.findById(input.accountId) : null;
    if (!input.accountId) {
      errors.accountId = 'Select an account.';
    } else if (!this.isAllowedHistoricalReference(account, input.accountId, original?.accountId)) {
      errors.accountId = 'Select an active account.';
    }

    const category = input.categoryId ? await this.categories.findById(input.categoryId) : null;
    if (!input.categoryId) {
      errors.categoryId = 'Select a category.';
    } else if (!this.isAllowedHistoricalReference(category, input.categoryId, original?.categoryId)) {
      errors.categoryId = 'Select an active category.';
    } else if (category?.type !== input.type) {
      errors.categoryId = `Select an ${input.type} category.`;
    }
  }

  private async validateTransfer(
    input: Extract<TransactionInput, { type: 'transfer' }>,
    errors: TransactionValidationErrors,
    original?: TransactionListItem,
  ): Promise<void> {
    if (!input.accountId) errors.accountId = 'Select a source account.';
    if (!input.destinationAccountId) errors.destinationAccountId = 'Select a destination account.';
    if (input.accountId && input.destinationAccountId && input.accountId === input.destinationAccountId) {
      errors.destinationAccountId = 'Source and destination accounts must be different.';
    }
    if (errors.accountId || errors.destinationAccountId) return;

    const accounts = await this.accounts.list(true);
    const source = accounts.find((account) => account.id === input.accountId);
    const destination = accounts.find((account) => account.id === input.destinationAccountId);
    this.validateTransferReference(source, input.accountId, original?.accountId, 'source', errors);
    this.validateTransferReference(
      destination,
      input.destinationAccountId,
      original?.destinationAccountId,
      'destination',
      errors,
    );
    if (errors.accountId || errors.destinationAccountId || !source || !destination) return;

    const projected = new Map(accounts.map((account) => [account.id, account.balance]));
    const affected = new Set<string>();
    if (original?.type === 'transfer' && original.status === 'posted') {
      this.applyBalanceEffect(projected, original.accountId, original.amount, affected);
      this.applyBalanceEffect(projected, original.destinationAccountId, -original.amount, affected);
    }
    this.applyBalanceEffect(projected, input.accountId, -input.amount, affected);
    this.applyBalanceEffect(projected, input.destinationAccountId, input.amount, affected);

    for (const accountId of affected) {
      const account = accounts.find((candidate) => candidate.id === accountId);
      const balance = projected.get(accountId);
      if (!account || balance === undefined) continue;
      if (!Number.isSafeInteger(balance)) {
        errors.amount = 'Transfer would exceed the supported safe COP balance range.';
        return;
      }
      if (
        account.type !== 'credit_card'
        && balance < 0
        && balance < account.balance
      ) {
        errors.amount = 'Transfer would leave an asset account with insufficient funds.';
        return;
      }
    }
  }

  private isAllowedHistoricalReference(
    value: Account | Category | null,
    proposedId: string,
    originalId: string | null | undefined,
  ): boolean {
    return Boolean(value && (!value.isArchived || proposedId === originalId));
  }

  private validateTransferReference(
    account: AccountWithBalance | undefined,
    proposedId: string,
    originalId: string | null | undefined,
    role: 'source' | 'destination',
    errors: TransactionValidationErrors,
  ): void {
    if (!account || (account.isArchived && proposedId !== originalId)) {
      errors[role === 'source' ? 'accountId' : 'destinationAccountId'] =
        `Select an active ${role} account.`;
    }
  }

  private applyBalanceEffect(
    balances: Map<string, number>,
    accountId: string | null,
    amount: number,
    affected: Set<string>,
  ): void {
    if (!accountId) return;
    balances.set(accountId, (balances.get(accountId) ?? 0) + amount);
    affected.add(accountId);
  }

  private async requireTransaction(id: string): Promise<TransactionListItem> {
    const transaction = await this.repository.findById(id);
    if (!transaction) {
      throw new TransactionActionError('transaction_not_found', 'Transaction not found.');
    }
    return transaction;
  }

  private async throwFailedWrite(id: string, action: 'edit' | 'void'): Promise<never> {
    const current = await this.repository.findById(id);
    if (!current) {
      throw new TransactionActionError('transaction_not_found', 'Transaction not found.');
    }
    if (current.status === 'voided') {
      throw new TransactionActionError(
        action === 'edit' ? 'editing_voided_transaction' : 'transaction_already_voided',
        action === 'edit' ? 'Voided transactions cannot be edited.' : 'Transaction is already voided.',
      );
    }
    throw new Error(`Unable to ${action} transaction.`);
  }
}
