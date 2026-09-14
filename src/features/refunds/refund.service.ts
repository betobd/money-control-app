import { bogotaToday, isValidCalendarDate } from '@/features/transactions/transaction-date';
import { notifyFinancialDataChanged } from '@/features/transactions/financial-data-events';
import { toBaseCurrencyMinor, type CurrencyCode } from '@/features/currency/currency';
import { getBaseCurrency } from '@/features/settings/base-currency';
import { getMessages } from '@/i18n/messages';
import type { TransactionService } from '@/features/transactions/transaction.service';
import type {
  TransactionListCursor,
  TransactionListItem,
  TransactionRecord,
} from '@/features/transactions/transaction.types';
import type {
  RefundActionErrorCode,
  RefundInput,
  RefundRepository,
  RefundSummary,
  RefundValidationErrors,
} from './refund.types';

export class RefundValidationError extends Error {
  constructor(public readonly fields: RefundValidationErrors) {
    super(getMessages().refunds.errors.validationFailed);
  }
}

export class RefundActionError extends Error {
  constructor(
    public readonly code: RefundActionErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export class RefundService {
  constructor(
    private readonly repository: RefundRepository,
    private readonly transactions: TransactionService,
    private readonly createId: () => string,
    private readonly now = () => new Date().toISOString(),
    private readonly today = () => bogotaToday(),
    /**
     * The device's base currency. Injected rather than read from the module cache
     * at each call site: the cache is process-global, so a test (or any runtime
     * that loads this module twice) could not set it deterministically.
     */
    private readonly baseCurrency: () => CurrencyCode = getBaseCurrency,
  ) {}

  async create(input: RefundInput): Promise<TransactionRecord> {
    const normalized = {
      ...input,
      originalTransactionId: input.originalTransactionId.trim(),
      note: input.note?.trim() || null,
    };
    const errors: RefundValidationErrors = {};
    const t = getMessages();
    if (!Number.isSafeInteger(normalized.amount) || normalized.amount <= 0) {
      errors.amount = t.transactions.errors.invalidAmount;
    }
    if (!isValidCalendarDate(normalized.transactionDate)) {
      errors.transactionDate = t.transactions.errors.invalidDate;
    }
    if (normalized.note && normalized.note.length > 200) {
      errors.note = t.transactions.errors.noteTooLong;
    }
    if (Object.keys(errors).length > 0) throw new RefundValidationError(errors);

    // A refund inherits the original expense's account and currency. A refund in a
    // currency other than the base carries its own refund-date rate snapshot and
    // base-currency amount.
    const baseCurrency = this.baseCurrency();
    const original = await this.transactions.get(normalized.originalTransactionId);
    const currency = original?.currency ?? baseCurrency;
    let baseAmountMinor = normalized.amount;
    let exchangeRate = normalized.exchangeRate ?? null;
    if (currency !== baseCurrency) {
      if (
        !exchangeRate ||
        !Number.isSafeInteger(exchangeRate.rateScaled) ||
        exchangeRate.rateScaled <= 0 ||
        !Number.isSafeInteger(exchangeRate.rateScale) ||
        exchangeRate.rateScale <= 0 ||
        !isValidCalendarDate(exchangeRate.effectiveDate)
      ) {
        throw new RefundValidationError({
          exchangeRate: t.refunds.errors.missingRate(currency, baseCurrency),
        });
      }
      baseAmountMinor = toBaseCurrencyMinor(normalized.amount, currency, baseCurrency, {
        rateScaled: exchangeRate.rateScaled,
        rateScale: exchangeRate.rateScale,
        baseCurrencyCode: exchangeRate.baseCurrencyCode,
        quoteCurrencyCode: exchangeRate.quoteCurrencyCode,
      });
    } else {
      exchangeRate = null;
    }

    const timestamp = this.now();
    const refund = await this.repository.createAtomic({
      id: this.createId(),
      originalTransactionId: normalized.originalTransactionId,
      amount: normalized.amount,
      currency,
      baseAmountMinor,
      baseCurrencyCode: baseCurrency,
      exchangeRate,
      transactionDate: normalized.transactionDate,
      note: normalized.note,
      createdAt: timestamp,
      updatedAt: timestamp,
    }, this.today());
    this.notifySafely({ operation: 'create', after: refund });
    return refund;
  }

  async void(id: string): Promise<TransactionRecord> {
    const refund = await this.repository.voidAtomic(id, this.now());
    this.notifySafely({ operation: 'void', after: refund });
    return refund;
  }

  async summarize(originalTransactionId: string): Promise<RefundSummary | null> {
    const original = await this.transactions.get(originalTransactionId);
    if (!original || original.type !== 'expense') return null;

    const refunds: TransactionListItem[] = [];
    let cursor: TransactionListCursor | undefined;
    do {
      const page = await this.transactions.list({
        originalTransactionId,
        types: ['refund'],
        limit: 100,
        cursor,
      });
      refunds.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    const refundedAmount = refunds
      .filter((refund) => refund.status === 'posted')
      .reduce((sum, refund) => sum + refund.amount, 0);
    const refundableRemaining = original.amount - refundedAmount;
    return {
      original,
      refunds,
      grossAmount: original.amount,
      refundedAmount,
      netExpense: refundableRemaining,
      refundableRemaining,
      refundStatus: refundedAmount === 0
        ? 'none'
        : refundableRemaining === 0
          ? 'full'
          : 'partial',
    };
  }

  private notifySafely(change: {
    operation: 'create' | 'void';
    after: TransactionRecord;
  }): void {
    try {
      notifyFinancialDataChanged({ kind: 'transaction', ...change });
    } catch {
      // The persisted refund is authoritative; notification refresh is best effort.
    }
  }
}
