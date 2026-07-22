import type { AccountRepository } from './account.repository';
import type {
  Account,
  AccountInput,
  AccountValidationErrors,
  AccountWithBalance,
} from './account.types';
import { accountTypes } from './account.types';
import { notifyFinancialDataChanged } from '@/features/transactions/financial-data-events';

export class AccountValidationError extends Error {
  constructor(public readonly fields: AccountValidationErrors) {
    super('Account validation failed.');
  }
}

export type AccountActionErrorCode =
  | 'account_not_found'
  | 'account_not_archived'
  | 'restore_name_conflict'
  | 'deletion_has_activity'
  | 'deletion_non_zero_balance';

export class AccountActionError extends Error {
  constructor(
    public readonly code: AccountActionErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase('es-CO');
}

export function validateAccountInput(input: AccountInput): AccountValidationErrors {
  const errors: AccountValidationErrors = {};
  if (!input.name.trim()) errors.name = 'Enter an account name.';
  if (!accountTypes.includes(input.type)) errors.type = 'Select a supported account type.';
  if (!Number.isSafeInteger(input.openingBalance)) {
    errors.openingBalance = 'Opening balance must be a whole, safe COP amount.';
  }
  if (input.type === 'credit_card') {
    if (!Number.isSafeInteger(input.creditLimit) || (input.creditLimit ?? 0) <= 0) {
      errors.creditLimit = 'Credit limit must be a positive whole, safe COP amount.';
    }
    if (!Number.isInteger(input.statementClosingDay) || (input.statementClosingDay ?? 0) < 1 || (input.statementClosingDay ?? 0) > 31) {
      errors.statementClosingDay = 'Closing day must be a whole number from 1 to 31.';
    }
    if (!Number.isInteger(input.paymentDueDay) || (input.paymentDueDay ?? 0) < 1 || (input.paymentDueDay ?? 0) > 31) {
      errors.paymentDueDay = 'Payment due day must be a whole number from 1 to 31.';
    }
  } else if (input.creditLimit !== null) {
    errors.creditLimit = 'Credit limit is only available for credit cards.';
  } else if (input.statementClosingDay !== null || input.paymentDueDay !== null) {
    errors.statementClosingDay = 'Card cycle settings are only available for credit cards.';
  }
  return errors;
}

type AccountServiceOptions = {
  createId: () => string;
  now?: () => string;
};

function createFallbackId(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (randomUUID) return randomUUID.call(globalThis.crypto);
  return `account-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export class AccountService {
  private readonly createId: () => string;
  private readonly now: () => string;

  constructor(
    private readonly repository: AccountRepository,
    options?: AccountServiceOptions,
  ) {
    this.createId = options?.createId ?? createFallbackId;
    this.now = options?.now ?? (() => new Date().toISOString());
  }

  async list(includeArchived: boolean): Promise<AccountWithBalance[]> {
    return this.repository.list(includeArchived);
  }

  async get(id: string): Promise<Account | null> {
    return this.repository.findById(id);
  }

  async canEditOpeningBalance(id: string): Promise<boolean> {
    return !(await this.repository.hasPostedTransactions(id));
  }

  async create(input: AccountInput): Promise<Account> {
    const normalized = await this.validate(input);
    const timestamp = this.now();
    const account: Account = {
      id: this.createId(),
      ...normalized,
      currency: 'COP',
      isArchived: false,
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.repository.create(account);
    notifyFinancialDataChanged({ kind: 'account', operation: 'create', accountId: account.id });
    return account;
  }

  async update(id: string, input: AccountInput): Promise<void> {
    const current = await this.repository.findById(id);
    if (!current) throw new Error('Account not found.');
    const normalized = await this.validate(input, id, current.isArchived);

    if (
      current.type === 'credit_card'
      && normalized.type !== 'credit_card'
      && await this.repository.hasCreditCardStatements(id)
    ) {
      throw new AccountValidationError({
        type: 'A credit card with statement history cannot change account type.',
      });
    }

    if (normalized.type === 'credit_card' && normalized.creditLimit !== null) {
      const withBalance = (await this.repository.list(true)).find((account) => account.id === id);
      const currentDebt = withBalance && withBalance.balance < 0 ? Math.abs(withBalance.balance) : 0;
      if (normalized.creditLimit < currentDebt) {
        throw new AccountValidationError({
          creditLimit: 'Credit limit cannot be lower than the card’s current debt.',
        });
      }
    }

    if (
      normalized.openingBalance !== current.openingBalance &&
      (await this.repository.hasPostedTransactions(id))
    ) {
      throw new AccountValidationError({
        openingBalance: 'Opening balance cannot change after posted account activity.',
      });
    }

    await this.repository.update(id, { ...normalized, updatedAt: this.now() });
    notifyFinancialDataChanged({ kind: 'account', operation: 'update', accountId: id });
  }

  async archive(id: string): Promise<void> {
    const account = await this.repository.findById(id);
    if (!account) throw new Error('Account not found.');
    if (!account.isArchived) {
      await this.repository.archive(id, this.now());
      notifyFinancialDataChanged({ kind: 'account', operation: 'archive', accountId: id });
    }
  }

  async restore(id: string): Promise<void> {
    const account = await this.repository.findById(id);
    if (!account) throw new AccountActionError('account_not_found', 'Account not found.');
    if (!account.isArchived) {
      throw new AccountActionError('account_not_archived', 'Only archived accounts can be restored.');
    }
    const duplicate = await this.repository.findActiveByNormalizedName(normalizeName(account.name), id);
    if (duplicate) {
      throw new AccountActionError(
        'restore_name_conflict',
        'An active account already uses this name. Rename the archived account before restoring it.',
      );
    }
    await this.repository.restore(id, this.now());
    notifyFinancialDataChanged({ kind: 'account', operation: 'restore', accountId: id });
  }

  async canPermanentlyDelete(id: string): Promise<boolean> {
    const eligibility = await this.repository.getDeletionEligibility(id);
    return Boolean(
      eligibility.account
      && eligibility.account.openingBalance === 0
      && eligibility.account.balance === 0
      && !eligibility.hasFinancialReferences,
    );
  }

  async permanentlyDelete(id: string): Promise<void> {
    const eligibility = await this.repository.getDeletionEligibility(id);
    if (!eligibility.account) {
      throw new AccountActionError('account_not_found', 'Account not found.');
    }
    if (eligibility.hasFinancialReferences) {
      throw new AccountActionError(
        'deletion_has_activity',
        'This account has financial activity or references and cannot be permanently deleted.',
      );
    }
    if (eligibility.account.openingBalance !== 0 || eligibility.account.balance !== 0) {
      throw new AccountActionError(
        'deletion_non_zero_balance',
        'Only accounts with zero opening and current balances can be permanently deleted.',
      );
    }
    await this.repository.permanentlyDelete(id);
    notifyFinancialDataChanged({ kind: 'account', operation: 'delete', accountId: id });
  }

  calculateNetWorth(accountsWithBalances: AccountWithBalance[]): number {
    const total = accountsWithBalances.reduce((sum, account) => sum + account.balance, 0);
    if (!Number.isSafeInteger(total)) throw new Error('Net worth exceeds the supported safe integer range.');
    return total;
  }

  private async validate(
    input: AccountInput,
    excludingId?: string,
    isArchived = false,
  ): Promise<AccountInput> {
    const normalized: AccountInput = {
      ...input,
      name: input.name.trim(),
      openingBalance: input.type === 'credit_card'
        ? input.openingBalance === 0 ? 0 : -Math.abs(input.openingBalance)
        : input.openingBalance,
      creditLimit: input.type === 'credit_card' ? input.creditLimit : null,
      statementClosingDay: input.type === 'credit_card' ? input.statementClosingDay : null,
      paymentDueDay: input.type === 'credit_card' ? input.paymentDueDay : null,
    };
    const errors = validateAccountInput(normalized);
    if (
      normalized.type === 'credit_card'
      && !errors.creditLimit
      && normalized.creditLimit !== null
      && normalized.openingBalance < 0
      && normalized.creditLimit < Math.abs(normalized.openingBalance)
    ) {
      errors.creditLimit = 'Credit limit cannot be lower than the opening card debt.';
    }
    if (!errors.name && !isArchived) {
      const duplicate = await this.repository.findActiveByNormalizedName(
        normalizeName(normalized.name),
        excludingId,
      );
      if (duplicate) errors.name = 'An active account already uses this name.';
    }
    if (Object.keys(errors).length > 0) throw new AccountValidationError(errors);
    return normalized;
  }
}
