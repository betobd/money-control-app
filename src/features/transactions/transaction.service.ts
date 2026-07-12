import type { Account, AccountWithBalance } from '@/features/accounts/account.types';
import type { AccountRepository } from '@/features/accounts/account.repository';
import type { CategoryRepository } from '@/features/categories/category.repository';
import { notifyFinancialDataChanged } from './financial-data-events';
import { isValidCalendarDate } from './transaction-date';
import type { TransactionRepository } from './transaction.repository';
import {
  supportedTransactionTypes,
  type TransactionInput,
  type TransactionRecord,
  type TransactionValidationErrors,
} from './transaction.types';

export class TransactionValidationError extends Error {
  constructor(public readonly fields: TransactionValidationErrors) {
    super('Transaction validation failed.');
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

  list() {
    return this.repository.list();
  }

  recent(limit = 3) {
    return this.repository.recent(limit);
  }

  summarizeMonth(month: string) {
    return this.repository.summarizeMonth(month);
  }

  async create(input: TransactionInput): Promise<TransactionRecord> {
    const normalized = { ...input, note: input.note?.trim() || null };
    const errors: TransactionValidationErrors = {};

    if (!supportedTransactionTypes.includes(normalized.type)) {
      errors.type = 'Select a supported transaction type.';
    }
    if (!Number.isSafeInteger(normalized.amount) || normalized.amount <= 0) {
      errors.amount = 'Enter a positive whole COP amount.';
    }
    if (!isValidCalendarDate(normalized.transactionDate)) {
      errors.transactionDate = 'Enter a valid date in YYYY-MM-DD format.';
    }
    if (normalized.note && normalized.note.length > 200) {
      errors.note = 'Note must be 200 characters or fewer.';
    }

    if (normalized.type === 'transfer') {
      await this.validateTransfer(normalized, errors);
    } else {
      await this.validateCategorizedTransaction(normalized, errors);
    }

    if (Object.keys(errors).length > 0) throw new TransactionValidationError(errors);

    const timestamp = this.now();
    const metadata = {
      id: this.createId(),
      status: 'posted' as const,
      currency: 'COP' as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const transaction: TransactionRecord = normalized.type === 'transfer'
      ? {
          ...normalized,
          ...metadata,
          categoryId: null,
        }
      : {
          ...normalized,
          ...metadata,
          destinationAccountId: null,
        };

    await this.repository.create(transaction);
    notifyFinancialDataChanged();
    return transaction;
  }

  private async validateCategorizedTransaction(
    input: Extract<TransactionInput, { type: 'expense' | 'income' }>,
    errors: TransactionValidationErrors,
  ): Promise<void> {
    if (!input.accountId) {
      errors.accountId = 'Select an account.';
    } else {
      const account = await this.accounts.findById(input.accountId);
      if (!account || account.isArchived) errors.accountId = 'Select an active account.';
    }

    if (!input.categoryId) {
      errors.categoryId = 'Select a category.';
      return;
    }
    const category = await this.categories.findById(input.categoryId);
    if (!category || category.isArchived) {
      errors.categoryId = 'Select an active category.';
    } else if (category.type !== input.type) {
      errors.categoryId = `Select an ${input.type} category.`;
    }
  }

  private async validateTransfer(
    input: Extract<TransactionInput, { type: 'transfer' }>,
    errors: TransactionValidationErrors,
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
    this.validateActiveTransferAccount(source, 'source', errors);
    this.validateActiveTransferAccount(destination, 'destination', errors);

    if (
      source
      && !source.isArchived
      && source.type !== 'credit_card'
      && Number.isSafeInteger(input.amount)
      && input.amount > source.balance
    ) {
      errors.amount = 'Amount exceeds the source account available balance.';
    }
    if (
      source
      && destination
      && Number.isSafeInteger(input.amount)
      && (
        !Number.isSafeInteger(source.balance - input.amount)
        || !Number.isSafeInteger(destination.balance + input.amount)
      )
    ) {
      errors.amount = 'Transfer would exceed the supported safe COP balance range.';
    }
  }

  private validateActiveTransferAccount(
    account: AccountWithBalance | Account | undefined,
    role: 'source' | 'destination',
    errors: TransactionValidationErrors,
  ): void {
    if (!account || account.isArchived) {
      errors[role === 'source' ? 'accountId' : 'destinationAccountId'] =
        `Select an active ${role} account.`;
    }
  }
}
