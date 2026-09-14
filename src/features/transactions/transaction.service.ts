import type { Account, AccountWithBalance } from '@/features/accounts/account.types';
import type { AccountRepository } from '@/features/accounts/account.repository';
import type { Category } from '@/features/categories/category.types';
import type { CategoryRepository } from '@/features/categories/category.repository';
import {
  isSupportedCurrency,
  toBaseCurrencyMinor,
  type CurrencyCode,
} from '@/features/currency/currency';
import { notifyFinancialDataChanged, type FinancialDataChange } from './financial-data-events';
import { getBaseCurrency } from '@/features/settings/base-currency';
import { getMessages } from '@/i18n/messages';
import { isValidCalendarDate } from './transaction-date';
import type { TransactionRepository } from './transaction.repository';
import {
  supportedTransactionTypes,
  type ExchangeRateSnapshotInput,
  type NormalizedTransactionListQuery,
  type ResolvedTransactionInput,
  type TransactionInput,
  type TransactionListQuery,
  type TransactionListItem,
  type TransactionRecord,
  type TransactionSnapshotFields,
  type TransactionUpdateRecord,
  type TransactionValidationErrors,
} from './transaction.types';

/** The active catalog's transaction errors, read when the message is built. */
function errorText() {
  return getMessages().transactions.errors;
}

function isValidRateInput(rate: ExchangeRateSnapshotInput | null | undefined): rate is ExchangeRateSnapshotInput {
  return Boolean(
    rate &&
      Number.isSafeInteger(rate.rateScaled) &&
      rate.rateScaled > 0 &&
      Number.isSafeInteger(rate.rateScale) &&
      rate.rateScale > 0 &&
      isValidCalendarDate(rate.effectiveDate),
  );
}

const EMPTY_SNAPSHOT: TransactionSnapshotFields = {
  baseAmountMinor: null,
  baseCurrencyCode: null,
  exchangeRateScaled: null,
  exchangeRateScale: null,
  exchangeRateBaseCode: null,
  exchangeRateQuoteCode: null,
  exchangeRateDate: null,
  exchangeRateSource: null,
  destinationAmountMinor: null,
  destinationCurrencyCode: null,
};

/** The rate columns for a snapshot, or all-null when there is no rate. */
function rateColumns(rate: ExchangeRateSnapshotInput | null) {
  if (!rate) {
    return {
      exchangeRateScaled: null,
      exchangeRateScale: null,
      exchangeRateBaseCode: null,
      exchangeRateQuoteCode: null,
      exchangeRateDate: null,
      exchangeRateSource: null,
    } as const;
  }
  return {
    exchangeRateScaled: rate.rateScaled,
    exchangeRateScale: rate.rateScale,
    exchangeRateBaseCode: rate.baseCurrencyCode,
    exchangeRateQuoteCode: rate.quoteCurrencyCode,
    exchangeRateDate: rate.effectiveDate,
    exchangeRateSource: rate.source,
  } as const;
}

/** Builds the persisted currency snapshot for a resolved, validated transaction input. */
function buildSnapshot(input: ResolvedTransactionInput, baseCurrency: CurrencyCode): TransactionSnapshotFields {
  if (input.type === 'transfer') {
    const crossCurrency = input.currency !== input.destinationCurrencyCode;
    return {
      ...EMPTY_SNAPSHOT,
      destinationAmountMinor: input.destinationAmountMinor,
      destinationCurrencyCode: input.destinationCurrencyCode,
      ...rateColumns(crossCurrency ? input.exchangeRate ?? null : null),
    };
  }
  if (input.currency === baseCurrency) {
    return { ...EMPTY_SNAPSHOT, baseAmountMinor: input.amount, baseCurrencyCode: baseCurrency };
  }
  const rate = input.exchangeRate as ExchangeRateSnapshotInput;
  return {
    ...EMPTY_SNAPSHOT,
    baseAmountMinor: toBaseCurrencyMinor(input.amount, input.currency, baseCurrency, {
      rateScaled: rate.rateScaled,
      rateScale: rate.rateScale,
      baseCurrencyCode: rate.baseCurrencyCode,
      quoteCurrencyCode: rate.quoteCurrencyCode,
    }),
    baseCurrencyCode: baseCurrency,
    ...rateColumns(rate),
  };
}

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
    throw new TransactionListQueryValidationError(getMessages().transactions.date.startDateFormat);
  }
  if (query.dateTo && !isValidCalendarDate(query.dateTo)) {
    throw new TransactionListQueryValidationError(getMessages().transactions.date.endDateFormat);
  }
  if (query.dateFrom && query.dateTo && query.dateTo < query.dateFrom) {
    throw new TransactionListQueryValidationError(getMessages().transactions.date.endBeforeStart);
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
    originalTransactionId: query.originalTransactionId?.trim() || undefined,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    limit,
    cursor: query.cursor,
  };
}

export class TransactionValidationError extends Error {
  /**
   * Stable brand. Cross-module `instanceof` compares constructor identity, which
   * is only reliable while every importer shares one module instance — not
   * guaranteed once a module is reached through more than one specifier form
   * (bundler chunking, a duplicated dependency, or the test runner's resolver).
   * Code in another feature must use `isTransactionValidationError`.
   */
  readonly isTransactionValidationError = true;

  constructor(public readonly fields: TransactionValidationErrors) {
    super(errorText().validationFailed);
  }
}

/** Identity-independent check for {@link TransactionValidationError}. */
export function isTransactionValidationError(value: unknown): value is TransactionValidationError {
  return value instanceof Error && (value as TransactionValidationError).isTransactionValidationError === true;
}

export type TransactionPersistence = (transaction: TransactionRecord) => Promise<void>;

export type TransactionActionErrorCode =
  | 'transaction_not_found'
  | 'transaction_already_voided'
  | 'editing_voided_transaction'
  | 'linked_refunds_exist'
  | 'refund_action_not_supported';

export class TransactionActionError extends Error {
  constructor(
    public readonly code: TransactionActionErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export class TransactionService {
  // Balance-affecting writes are serialized so a transfer's funds/safe-integer
  // check and its persistence form a single critical section. Without this, two
  // interleaved async flows (a double-tap, or a recurring confirmation running
  // alongside a manual add) could both validate against the same pre-write
  // balance and both commit, overdrawing an asset account past its derived
  // balance — the invariant financial-rules.md §4 requires enforced before
  // persistence. All create/update paths share the one transactionService
  // singleton, so serializing here covers manual, recurring, refund-adjacent,
  // and card-payment writes in this single-runtime app.
  private writeLock: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly repository: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly createId: () => string,
    private readonly now = () => new Date().toISOString(),
    // Injectable so a caller (and every test) can observe invalidation directly
    // instead of subscribing to the module-level listener set. BudgetService
    // takes the same seam for the same reason.
    private readonly notifyChanged: (change: FinancialDataChange) => void = notifyFinancialDataChanged,
    /**
     * The device's base currency. Injected rather than read from the module cache
     * at each call site: the cache is process-global, so a test (or any runtime
     * that loads this module twice) could not set it deterministically.
     */
    private readonly baseCurrency: () => CurrencyCode = getBaseCurrency,
  ) {}

  private serializeWrite<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.writeLock.then(operation, operation);
    this.writeLock = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

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

  async create(
    input: TransactionInput,
    persist: TransactionPersistence = (transaction) => this.repository.create(transaction),
  ): Promise<TransactionRecord> {
    return this.serializeWrite(async () => {
      const normalized = this.normalize(input);
      const resolved = await this.validate(normalized);
      const timestamp = this.now();
      const snapshot = buildSnapshot(resolved, this.baseCurrency());
      const metadata = {
        id: this.createId(),
        status: 'posted' as const,
        currency: resolved.currency,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const { exchangeRate: _ignoredRate, ...fields } = resolved;
      const transaction: TransactionRecord = fields.type === 'transfer'
        ? {
            ...fields,
            ...metadata,
            ...snapshot,
            categoryId: null,
            subcategoryId: null,
            originalTransactionId: null,
          }
        : {
            ...fields,
            ...metadata,
            ...snapshot,
            destinationAccountId: null,
            originalTransactionId: null,
          };

      await persist(transaction);
      this.notifyChanged({ kind: 'transaction', operation: 'create', after: transaction });
      return transaction;
    });
  }

  async validateTemplate(input: TransactionInput): Promise<ResolvedTransactionInput> {
    const normalized = this.normalize(input);
    // Templates are not postable transactions: skip the transfer-funds check and
    // the posting-time exchange-rate requirement (both are enforced at post time).
    return this.validate(normalized, undefined, {}, false, false);
  }

  async update(id: string, input: TransactionInput): Promise<TransactionListItem> {
    return this.serializeWrite(() => this.performUpdate(id, input));
  }

  private async performUpdate(id: string, input: TransactionInput): Promise<TransactionListItem> {
    const current = await this.requireTransaction(id);
    if (current.type === 'refund') {
      throw new TransactionActionError(
        'refund_action_not_supported',
        errorText().refundsCannotBeEdited,
      );
    }
    if (current.status === 'voided') {
      throw new TransactionActionError(
        'editing_voided_transaction',
        errorText().voidedCannotBeEdited,
      );
    }
    if (current.type === 'expense' && await this.repository.hasPostedRefunds(id)) {
      throw new TransactionActionError(
        'linked_refunds_exist',
        errorText().voidRefundsBeforeEditing,
      );
    }

    const normalized = this.normalize(input);
    const errors: TransactionValidationErrors = {};
    if (normalized.type !== current.type) {
      errors.type = errorText().typeCannotChange;
    }
    const resolved = await this.validate(normalized, current, errors);

    const updatedAt = this.now();
    const snapshot = buildSnapshot(resolved, this.baseCurrency());
    const update: TransactionUpdateRecord = {
      amount: resolved.amount,
      currency: resolved.currency,
      accountId: resolved.accountId,
      destinationAccountId: resolved.type === 'transfer' ? resolved.destinationAccountId : null,
      categoryId: resolved.type === 'transfer' ? null : resolved.categoryId,
      subcategoryId: resolved.type === 'transfer' ? null : resolved.subcategoryId,
      transactionDate: resolved.transactionDate,
      note: resolved.note,
      updatedAt,
      ...snapshot,
    };
    if (!(await this.repository.updatePosted(id, update))) {
      await this.throwFailedWrite(id, 'edit');
    }
    const updated = await this.requireTransaction(id);
    this.notifyChanged({ kind: 'transaction', operation: 'update', before: current, after: updated });
    return updated;
  }

  async void(id: string): Promise<TransactionListItem> {
    const current = await this.requireTransaction(id);
    if (current.type === 'refund') {
      throw new TransactionActionError(
        'refund_action_not_supported',
        errorText().useRefundDetailsToVoid,
      );
    }
    if (current.status === 'voided') {
      throw new TransactionActionError(
        'transaction_already_voided',
        errorText().alreadyVoided,
      );
    }
    if (current.type === 'expense' && await this.repository.hasPostedRefunds(id)) {
      throw new TransactionActionError(
        'linked_refunds_exist',
        errorText().voidOrRemoveRefundsBeforeVoiding,
      );
    }
    if (!(await this.repository.voidPosted(id, this.now()))) {
      await this.throwFailedWrite(id, 'void');
    }
    const voided = await this.requireTransaction(id);
    this.notifyChanged({ kind: 'transaction', operation: 'void', before: current, after: voided });
    return voided;
  }

  private normalize(input: TransactionInput): TransactionInput {
    return { ...input, note: input.note?.trim() || null };
  }

  private async validate(
    input: TransactionInput,
    original?: TransactionListItem,
    errors: TransactionValidationErrors = {},
    validateTransferFunds = true,
    requireExchangeRate = true,
  ): Promise<ResolvedTransactionInput> {
    if (!supportedTransactionTypes.includes(input.type)) {
      errors.type = errorText().selectSupportedType;
    }
    if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
      errors.amount = errorText().invalidAmount;
    }
    if (input.currency !== undefined && !isSupportedCurrency(input.currency)) {
      errors.currency = errorText().selectSupportedCurrency;
    }
    if (!isValidCalendarDate(input.transactionDate)) {
      errors.transactionDate = errorText().invalidDate;
    }
    if (input.note && input.note.length > 200) {
      errors.note = errorText().noteTooLong;
    }

    const resolved = input.type === 'transfer'
      ? await this.validateTransfer(input, errors, original, validateTransferFunds)
      : await this.validateCategorizedTransaction(input, errors, original, requireExchangeRate);
    if (Object.keys(errors).length > 0) throw new TransactionValidationError(errors);
    return resolved;
  }

  private async validateCategorizedTransaction(
    input: Extract<TransactionInput, { type: 'expense' | 'income' }>,
    errors: TransactionValidationErrors,
    original?: TransactionListItem,
    requireExchangeRate = true,
  ): Promise<ResolvedTransactionInput> {
    const account = input.accountId ? await this.accounts.findById(input.accountId) : null;
    if (!input.accountId) {
      errors.accountId = errorText().selectAccount;
    } else if (!this.isAllowedHistoricalReference(account, input.accountId, original?.accountId)) {
      errors.accountId = errorText().selectActiveAccount;
    } else if (input.currency !== undefined && account && account.currency !== input.currency) {
      errors.currency = errorText().currencyMismatch;
    }

    const selection = await this.resolveCategorySelection(input, errors, original);

    // The account is the source of truth for currency.
    const baseCurrency = this.baseCurrency();
    const currency: CurrencyCode = account?.currency ?? input.currency ?? baseCurrency;

    // A non-base-currency income/expense must carry a valid rate snapshot at
    // posting time. Recurring templates skip this: they capture the rate later,
    // when each occurrence is posted (see confirmOccurrence).
    if (requireExchangeRate && currency !== baseCurrency && !isValidRateInput(input.exchangeRate)) {
      errors.exchangeRate = errorText().missingRate;
    }

    const { exchangeRate, ...rest } = input;
    return {
      ...rest,
      ...selection,
      currency,
      exchangeRate: exchangeRate ?? null,
      destinationAccountId: null,
    };
  }

  /**
   * Settles the (category, subcategory) pair a categorized transaction stores.
   *
   * Callers may send the pair explicitly, or just the node the user tapped: when
   * `categoryId` names a subcategory its parent is inferred, so the stored pair is
   * always (parent, leaf) and never (leaf, null). Keeping this in the service
   * means every write path — manual entry, recurring materialization, backup
   * restore — is protected from mismatched pairs such as Transporte + Mercado,
   * and no screen has to understand the hierarchy.
   *
   * This mirrors the database trigger `transactions_subcategory_insert_guard`;
   * the trigger is the backstop, this is the readable error.
   */
  private async resolveCategorySelection(
    input: Extract<TransactionInput, { type: 'expense' | 'income' }>,
    errors: TransactionValidationErrors,
    original?: TransactionListItem,
  ): Promise<{ categoryId: string; subcategoryId: string | null }> {
    const requested = { categoryId: input.categoryId, subcategoryId: input.subcategoryId ?? null };
    if (!input.categoryId) {
      errors.categoryId = errorText().selectCategory;
      return requested;
    }

    const selected = await this.categories.findById(input.categoryId);
    if (!selected) {
      errors.categoryId = errorText().selectActiveCategory;
      return requested;
    }

    // A category read from a pre-v6 backup has no parent field at all; treat a
    // missing parent as top-level rather than as an unresolvable parent id.
    const selectedParentId = selected.parentCategoryId ?? null;
    const infersParent = selectedParentId !== null && requested.subcategoryId === null;
    const categoryId = infersParent ? selectedParentId : selected.id;
    const subcategoryId = infersParent ? selected.id : requested.subcategoryId;
    const resolved = { categoryId, subcategoryId };

    const category = infersParent ? await this.categories.findById(categoryId) : selected;
    if (!category) {
      errors.categoryId = errorText().selectActiveCategory;
      return resolved;
    }
    if ((category.parentCategoryId ?? null) !== null) {
      // Only reachable when a caller sends both a leaf category and a subcategory.
      errors.categoryId = errorText().selectTopLevelCategory;
      return resolved;
    }
    if (!this.isAllowedHistoricalReference(category, categoryId, original?.categoryId)) {
      errors.categoryId = errorText().selectActiveCategory;
    } else if (category.type !== input.type) {
      errors.categoryId = input.type === 'income'
        ? errorText().selectIncomeCategory
        : errorText().selectExpenseCategory;
    }

    if (subcategoryId !== null) {
      const subcategory = infersParent ? selected : await this.categories.findById(subcategoryId);
      if (!subcategory) {
        errors.subcategoryId = errorText().selectActiveSubcategory;
      } else if ((subcategory.parentCategoryId ?? null) !== categoryId) {
        errors.subcategoryId = errorText().subcategoryMismatch;
      } else if (!this.isAllowedHistoricalReference(subcategory, subcategoryId, original?.subcategoryId)) {
        errors.subcategoryId = errorText().selectActiveSubcategory;
      }
    }

    return resolved;
  }

  private async validateTransfer(
    input: Extract<TransactionInput, { type: 'transfer' }>,
    errors: TransactionValidationErrors,
    original?: TransactionListItem,
    validateFunds = true,
  ): Promise<ResolvedTransactionInput> {
    const accounts = await this.accounts.list(true);
    const source = accounts.find((account) => account.id === input.accountId);
    const destination = accounts.find((account) => account.id === input.destinationAccountId);
    const currency: CurrencyCode = source?.currency ?? input.currency ?? this.baseCurrency();
    const destinationCurrencyCode: CurrencyCode =
      destination?.currency ?? input.destinationCurrencyCode ?? currency;
    const crossCurrency = currency !== destinationCurrencyCode;
    const destinationAmountMinor = input.destinationAmountMinor ?? (crossCurrency ? Number.NaN : input.amount);

    const resolved: ResolvedTransactionInput = {
      type: 'transfer',
      amount: input.amount,
      currency,
      accountId: input.accountId,
      destinationAccountId: input.destinationAccountId,
      destinationAmountMinor,
      destinationCurrencyCode,
      categoryId: null,
      subcategoryId: null,
      transactionDate: input.transactionDate,
      note: input.note,
      exchangeRate: input.exchangeRate ?? null,
    };

    if (!input.accountId) errors.accountId = errorText().selectSourceAccount;
    if (!input.destinationAccountId) errors.destinationAccountId = errorText().selectDestinationAccount;
    if (input.accountId && input.destinationAccountId && input.accountId === input.destinationAccountId) {
      errors.destinationAccountId = errorText().accountsMustDiffer;
    }
    if (errors.accountId || errors.destinationAccountId) return resolved;

    this.validateTransferReference(source, input.accountId, original?.accountId, 'source', errors);
    this.validateTransferReference(
      destination,
      input.destinationAccountId,
      original?.destinationAccountId,
      'destination',
      errors,
    );
    if (errors.accountId || errors.destinationAccountId || !source || !destination) return resolved;

    if (!Number.isSafeInteger(destinationAmountMinor) || destinationAmountMinor <= 0) {
      errors.destinationAmount = errorText().incompleteTransfer;
    }
    if (crossCurrency) {
      // Cross-currency: both amounts are authoritative and an effective rate is saved.
      if (!isValidRateInput(input.exchangeRate)) errors.exchangeRate = errorText().incompleteTransfer;
    } else if (destinationAmountMinor !== input.amount) {
      // Same-currency: the destination must receive exactly the source amount.
      errors.destinationAmount = errorText().sameCurrencyMismatch;
    }
    if (errors.amount || errors.destinationAmount || errors.exchangeRate) return resolved;
    if (!validateFunds) return resolved;

    // Balances are per-account in native currency: source loses `amount`, destination
    // gains its own-currency `destinationAmountMinor`.
    const projected = new Map(accounts.map((account) => [account.id, account.balance]));
    const affected = new Set<string>();
    if (original?.type === 'transfer' && original.status === 'posted') {
      const originalDestinationAmount = original.destinationAmountMinor ?? original.amount;
      this.applyBalanceEffect(projected, original.accountId, original.amount, affected);
      this.applyBalanceEffect(projected, original.destinationAccountId, -originalDestinationAmount, affected);
    }
    this.applyBalanceEffect(projected, input.accountId, -input.amount, affected);
    this.applyBalanceEffect(projected, input.destinationAccountId, destinationAmountMinor, affected);

    for (const accountId of affected) {
      const account = accounts.find((candidate) => candidate.id === accountId);
      const balance = projected.get(accountId);
      if (!account || balance === undefined) continue;
      if (!Number.isSafeInteger(balance)) {
        errors.amount = errorText().exceedsSafeRange;
        return resolved;
      }
      if (
        account.type !== 'credit_card'
        && balance < 0
        && balance < account.balance
      ) {
        errors.amount = errorText().insufficientFunds;
        return resolved;
      }
    }
    return resolved;
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
        role === 'source' ? errorText().selectActiveSourceAccount : errorText().selectActiveDestinationAccount;
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
      throw new TransactionActionError('transaction_not_found', errorText().notFound);
    }
    return transaction;
  }

  private async throwFailedWrite(id: string, action: 'edit' | 'void'): Promise<never> {
    const current = await this.repository.findById(id);
    if (!current) {
      throw new TransactionActionError('transaction_not_found', errorText().notFound);
    }
    if (current.status === 'voided') {
      throw new TransactionActionError(
        action === 'edit' ? 'editing_voided_transaction' : 'transaction_already_voided',
        action === 'edit' ? errorText().voidedCannotBeEdited : errorText().alreadyVoided,
      );
    }
    if (current.type === 'expense' && await this.repository.hasPostedRefunds(id)) {
      throw new TransactionActionError(
        'linked_refunds_exist',
        action === 'edit'
          ? errorText().voidRefundsBeforeEditing
          : errorText().voidRefundsBeforeVoiding,
      );
    }
    throw new Error(action === 'edit' ? errorText().unableToEdit : errorText().unableToVoid);
  }
}
