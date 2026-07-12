import type { AccountRepository } from './account.repository';
import type {
  Account,
  AccountInput,
  AccountValidationErrors,
  AccountWithBalance,
} from './account.types';
import { accountTypes } from './account.types';

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
    if (input.creditLimit !== null && (!Number.isSafeInteger(input.creditLimit) || input.creditLimit < 0)) {
      errors.creditLimit = 'Credit limit must be a non-negative whole COP amount.';
    }
  } else if (input.creditLimit !== null) {
    errors.creditLimit = 'Credit limit is only available for credit cards.';
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
    return account;
  }

  async update(id: string, input: AccountInput): Promise<void> {
    const current = await this.repository.findById(id);
    if (!current) throw new Error('Account not found.');
    const normalized = await this.validate(input, id, current.isArchived);

    if (
      normalized.openingBalance !== current.openingBalance &&
      (await this.repository.hasPostedTransactions(id))
    ) {
      throw new AccountValidationError({
        openingBalance: 'Opening balance cannot change after posted account activity.',
      });
    }

    await this.repository.update(id, { ...normalized, updatedAt: this.now() });
  }

  async archive(id: string): Promise<void> {
    const account = await this.repository.findById(id);
    if (!account) throw new Error('Account not found.');
    if (!account.isArchived) await this.repository.archive(id, this.now());
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
    };
    const errors = validateAccountInput(normalized);
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
