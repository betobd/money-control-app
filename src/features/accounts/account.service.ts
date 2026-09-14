import type { AccountRepository } from './account.repository';
import type {
  Account,
  AccountInput,
  AccountValidationErrors,
  AccountWithBalance,
} from './account.types';
import { accountTypes } from './account.types';
import { notifyFinancialDataChanged } from '@/features/transactions/financial-data-events';
import { isSupportedCurrency, type CurrencyCode } from '@/features/currency/currency';
import type { ValuationRates } from '@/features/exchange-rates/valuation-rates';
import { getMessages } from '@/i18n/messages';

export type EstimatedNetWorth = {
  /** Consolidated base-currency total, or null when it cannot be computed. */
  totalBaseMinor: number | null;
  /** The currency `totalBaseMinor` is in, so callers never have to assume. */
  baseCurrency: CurrencyCode;
  /** True when foreign accounts exist but a missing rate excludes them. */
  incomplete: boolean;
  /** True when at least one foreign account contributes (or would contribute). */
  includesForeign: boolean;
  /** Currencies held that have no rate. Names them in the incomplete message. */
  missingCurrencies: CurrencyCode[];
};

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
  const messages = getMessages().accounts.validation;
  if (!input.name.trim()) errors.name = messages.nameRequired;
  // `other` is a legacy/backup value only; new accounts must use a creatable type.
  if (!(accountTypes as readonly string[]).includes(input.type)) errors.type = messages.typeUnsupported;
  if (!isSupportedCurrency(input.currency)) errors.currency = messages.currencyUnsupported;
  if (!Number.isSafeInteger(input.openingBalance)) {
    errors.openingBalance = messages.openingBalanceInvalid;
  }
  if (input.type === 'credit_card') {
    if (!Number.isSafeInteger(input.creditLimit) || (input.creditLimit ?? 0) <= 0) {
      errors.creditLimit = messages.creditLimitInvalid;
    }
    if (!Number.isInteger(input.statementClosingDay) || (input.statementClosingDay ?? 0) < 1 || (input.statementClosingDay ?? 0) > 31) {
      errors.statementClosingDay = messages.closingDayInvalid;
    }
    if (!Number.isInteger(input.paymentDueDay) || (input.paymentDueDay ?? 0) < 1 || (input.paymentDueDay ?? 0) > 31) {
      errors.paymentDueDay = messages.dueDayInvalid;
    }
  } else if (input.creditLimit !== null) {
    errors.creditLimit = messages.creditLimitCardOnly;
  } else if (input.statementClosingDay !== null || input.paymentDueDay !== null) {
    errors.statementClosingDay = messages.cycleCardOnly;
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

  /** Currency may change only while the account has no financial history. */
  async canChangeCurrency(id: string): Promise<boolean> {
    const eligibility = await this.repository.getDeletionEligibility(id);
    return Boolean(
      eligibility.account &&
        !eligibility.hasFinancialReferences &&
        eligibility.account.openingBalance === 0,
    );
  }

  async create(input: AccountInput): Promise<Account> {
    const normalized = await this.validate(input);
    const timestamp = this.now();
    const account: Account = {
      id: this.createId(),
      ...normalized,
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
    if (!current) throw new Error(getMessages().accounts.errors.notFound);
    const normalized = await this.validate(input, id, current.isArchived);

    if (normalized.currency !== current.currency) {
      const eligibility = await this.repository.getDeletionEligibility(id);
      const hasFinancialHistory =
        eligibility.hasFinancialReferences || current.openingBalance !== 0;
      if (hasFinancialHistory) {
        throw new AccountValidationError({
          currency: getMessages().accounts.validation.currencyLocked,
        });
      }
    }

    if (
      current.type === 'credit_card'
      && normalized.type !== 'credit_card'
      && await this.repository.hasCreditCardStatements(id)
    ) {
      throw new AccountValidationError({
        type: getMessages().accounts.validation.cardTypeLocked,
      });
    }

    if (normalized.type === 'credit_card' && normalized.creditLimit !== null) {
      const withBalance = (await this.repository.list(true)).find((account) => account.id === id);
      const currentDebt = withBalance && withBalance.balance < 0 ? Math.abs(withBalance.balance) : 0;
      if (normalized.creditLimit < currentDebt) {
        throw new AccountValidationError({
          creditLimit: getMessages().accounts.validation.creditLimitBelowDebt,
        });
      }
    }

    if (
      normalized.openingBalance !== current.openingBalance &&
      (await this.repository.hasPostedTransactions(id))
    ) {
      throw new AccountValidationError({
        openingBalance: getMessages().accounts.validation.openingBalanceLocked,
      });
    }

    await this.repository.update(id, { ...normalized, updatedAt: this.now() });
    notifyFinancialDataChanged({ kind: 'account', operation: 'update', accountId: id });
  }

  async archive(id: string): Promise<void> {
    const account = await this.repository.findById(id);
    if (!account) throw new Error(getMessages().accounts.errors.notFound);
    if (!account.isArchived) {
      await this.repository.archive(id, this.now());
      notifyFinancialDataChanged({ kind: 'account', operation: 'archive', accountId: id });
    }
  }

  async restore(id: string): Promise<void> {
    const account = await this.repository.findById(id);
    if (!account) throw new AccountActionError('account_not_found', getMessages().accounts.errors.notFound);
    if (!account.isArchived) {
      throw new AccountActionError('account_not_archived', getMessages().accounts.errors.onlyArchivedRestore);
    }
    const duplicate = await this.repository.findActiveByNormalizedName(normalizeName(account.name), id);
    if (duplicate) {
      throw new AccountActionError(
        'restore_name_conflict',
        getMessages().accounts.errors.restoreNameConflict,
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
      throw new AccountActionError('account_not_found', getMessages().accounts.errors.notFound);
    }
    if (eligibility.hasFinancialReferences) {
      throw new AccountActionError(
        'deletion_has_activity',
        getMessages().accounts.errors.deletionHasActivity,
      );
    }
    if (eligibility.account.openingBalance !== 0 || eligibility.account.balance !== 0) {
      throw new AccountActionError(
        'deletion_non_zero_balance',
        getMessages().accounts.errors.deletionNonZeroBalance,
      );
    }
    await this.repository.permanentlyDelete(id);
    notifyFinancialDataChanged({ kind: 'account', operation: 'delete', accountId: id });
  }

  /**
   * Estimated consolidated net worth in the base currency. Base-currency balances
   * contribute exactly; foreign balances are converted at the saved valuation
   * rate. An account whose currency has no rate is excluded and the result is
   * marked incomplete — never counted as zero, which would read as a real total.
   * See docs/decisions/0008-configurable-base-currency.md.
   */
  estimateNetWorth(
    accountsWithBalances: AccountWithBalance[],
    rates: ValuationRates,
  ): EstimatedNetWorth {
    let total = 0;
    let incomplete = false;
    let includesForeign = false;
    const missing = new Set<CurrencyCode>();
    for (const account of accountsWithBalances) {
      if (account.currency === rates.baseCurrency) {
        total += account.balance;
        continue;
      }
      includesForeign = true;
      const valued = rates.toBase(account.balance, account.currency);
      if (valued === null) {
        incomplete = true;
        missing.add(account.currency);
        continue;
      }
      total += valued;
    }
    if (!Number.isSafeInteger(total)) {
      throw new Error('Net worth exceeds the supported safe integer range.');
    }
    return {
      totalBaseMinor: incomplete && includesForeign ? null : total,
      baseCurrency: rates.baseCurrency,
      incomplete,
      includesForeign,
      missingCurrencies: [...missing],
    };
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
      errors.creditLimit = getMessages().accounts.validation.creditLimitBelowOpeningDebt;
    }
    if (!errors.name && !isArchived) {
      const duplicate = await this.repository.findActiveByNormalizedName(
        normalizeName(normalized.name),
        excludingId,
      );
      if (duplicate) errors.name = getMessages().accounts.validation.nameTaken;
    }
    if (Object.keys(errors).length > 0) throw new AccountValidationError(errors);
    return normalized;
  }
}
