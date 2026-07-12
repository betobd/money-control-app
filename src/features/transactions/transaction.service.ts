import type { AccountRepository } from '@/features/accounts/account.repository';
import type { CategoryRepository } from '@/features/categories/category.repository';
import { isValidCalendarDate } from './transaction-date';
import type { TransactionRepository } from './transaction.repository';
import { notifyFinancialDataChanged } from './financial-data-events';
import { supportedTransactionTypes, type TransactionInput, type TransactionRecord, type TransactionValidationErrors } from './transaction.types';

export class TransactionValidationError extends Error { constructor(public readonly fields: TransactionValidationErrors) { super('Transaction validation failed.'); } }
export class TransactionService {
  constructor(private readonly repository: TransactionRepository, private readonly accounts: AccountRepository, private readonly categories: CategoryRepository, private readonly createId: () => string, private readonly now = () => new Date().toISOString()) {}
  list() { return this.repository.list(); } recent(limit = 3) { return this.repository.recent(limit); } summarizeMonth(month: string) { return this.repository.summarizeMonth(month); }
  async create(input: TransactionInput): Promise<TransactionRecord> {
    const normalized = { ...input, note: input.note?.trim() || null }; const errors: TransactionValidationErrors = {};
    if (!supportedTransactionTypes.includes(normalized.type)) errors.type = 'Only expense and income are supported.';
    if (!Number.isSafeInteger(normalized.amount) || normalized.amount <= 0) errors.amount = 'Enter a positive whole COP amount.';
    if (!isValidCalendarDate(normalized.transactionDate)) errors.transactionDate = 'Enter a valid date in YYYY-MM-DD format.';
    if (normalized.note && normalized.note.length > 200) errors.note = 'Note must be 200 characters or fewer.';
    if (!normalized.accountId) errors.accountId = 'Select an account.'; else { const account = await this.accounts.findById(normalized.accountId); if (!account || account.isArchived) errors.accountId = 'Select an active account.'; }
    if (!normalized.categoryId) errors.categoryId = 'Select a category.'; else { const category = await this.categories.findById(normalized.categoryId); if (!category || category.isArchived) errors.categoryId = 'Select an active category.'; else if (category.type !== normalized.type) errors.categoryId = `Select an ${normalized.type} category.`; }
    if (Object.keys(errors).length) throw new TransactionValidationError(errors);
    const timestamp = this.now(); const transaction: TransactionRecord = { id: this.createId(), ...normalized, status: 'posted', currency: 'COP', destinationAccountId: null, createdAt: timestamp, updatedAt: timestamp };
    await this.repository.create(transaction);
    notifyFinancialDataChanged();
    return transaction;
  }
}
