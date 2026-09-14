import { getBaseCurrency } from '@/features/settings/base-currency';
import { bogotaToday, isValidCalendarDate } from '@/features/transactions/transaction-date';
import {
  isTransactionValidationError,
  type TransactionService,
} from '@/features/transactions/transaction.service';
import type {
  ExchangeRateSnapshotInput,
  TransactionInput,
} from '@/features/transactions/transaction.types';
import type { CurrencyCode } from '@/features/currency/currency';
import { getMessages } from '@/i18n/messages';
import { collectDueDates, firstScheduledOnOrAfter } from './recurring-schedule';
import { notifyRecurringDataChanged } from './recurring-data-events';
import type { RecurringTransactionRepository } from './recurring-transaction.repository';
import {
  recurringFrequencies,
  type RecurringGenerationResult,
  type RecurringOccurrenceListItem,
  type RecurringOccurrenceRecord,
  type RecurringRuleInput,
  type RecurringRuleRecord,
  type RecurringRuleValidationErrors,
  type RecurringTransactionShape,
} from './recurring-transaction.types';

const GENERATION_LIMIT_PER_RULE = 100;

export class RecurringRuleValidationError extends Error {
  /** See the note on TransactionValidationError's brand. */
  readonly isRecurringRuleValidationError = true;

  constructor(public readonly fields: RecurringRuleValidationErrors) {
    super('Recurring transaction validation failed.');
  }
}

/** Identity-independent check for {@link RecurringRuleValidationError}. */
export function isRecurringRuleValidationError(value: unknown): value is RecurringRuleValidationError {
  return value instanceof Error && (value as RecurringRuleValidationError).isRecurringRuleValidationError === true;
}

export type RecurringActionErrorCode =
  | 'rule_not_found'
  | 'rule_ended'
  | 'occurrence_not_found'
  | 'occurrence_not_pending'
  | 'missing_exchange_rate';

export class RecurringActionError extends Error {
  constructor(
    public readonly code: RecurringActionErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export class RecurringTransactionService {
  constructor(
    private readonly repository: RecurringTransactionRepository,
    private readonly transactions: TransactionService,
    private readonly createId: () => string,
    private readonly now = () => new Date().toISOString(),
    private readonly today = () => bogotaToday(),
    /** Resolves the current rate snapshot when posting a foreign-currency occurrence. */
    private readonly resolveExchangeRate: (currency: CurrencyCode) => Promise<ExchangeRateSnapshotInput | null> = async () => null,
    /**
     * The device's base currency. Injected rather than read from the module cache
     * at each call site: the cache is process-global, so a test (or any runtime
     * that loads this module twice) could not set it deterministically.
     */
    private readonly baseCurrency: () => CurrencyCode = getBaseCurrency,
  ) {}

  listRules() {
    return this.repository.listRules();
  }

  getRule(id: string) {
    return this.repository.findRule(id);
  }

  getOccurrence(id: string) {
    return this.repository.findOccurrence(id);
  }

  listPendingDue() {
    return this.repository.listPendingDue(this.today());
  }

  listPendingThrough(throughDate: string) {
    if (!isValidCalendarDate(throughDate)) throw new Error('Recurring reminder horizon must be a valid calendar date.');
    return this.repository.listPendingDue(throughDate);
  }

  listRecentOccurrences(limit = 20) {
    return this.repository.listRecentOccurrences(limit);
  }

  async createRule(input: RecurringRuleInput): Promise<RecurringRuleRecord> {
    const { input: normalized, currency } = await this.validateRule(input);
    const timestamp = this.now();
    const rule: RecurringRuleRecord = {
      ...normalized,
      id: this.createId(),
      currency,
      nextOccurrenceDate: normalized.startDate,
      isActive: true,
      endedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.repository.createRule(rule);
    notifyRecurringDataChanged();
    return rule;
  }

  async updateRule(id: string, input: RecurringRuleInput): Promise<RecurringRuleRecord> {
    const current = await this.requireRule(id);
    if (current.endedAt) {
      throw new RecurringActionError('rule_ended', getMessages().recurring.endedCannotEdit);
    }
    const { input: normalized, currency } = await this.validateRule(input);
    const latest = await this.repository.findLatestScheduledDate(id);
    const target = latest ? dayAfter(latest) : this.today();
    const nextOccurrenceDate = firstScheduledOnOrAfter(
      normalized.startDate,
      target > normalized.startDate ? target : normalized.startDate,
      normalized.frequency,
      normalized.interval,
    );
    const updated: RecurringRuleRecord = {
      ...current,
      ...normalized,
      currency,
      nextOccurrenceDate,
      updatedAt: this.now(),
    };
    await this.repository.updateRule(id, updated);
    notifyRecurringDataChanged();
    return updated;
  }

  async generateDueOccurrences(): Promise<RecurringGenerationResult> {
    const throughDate = this.today();
    const dueRules = await this.repository.listDueRules(throughDate);
    let generated = 0;
    let limitedRules = 0;

    for (const rule of dueRules) {
      const result = collectDueDates(rule, throughDate, GENERATION_LIMIT_PER_RULE);
      const timestamp = this.now();
      const occurrences = result.dates.map((scheduledDate): RecurringOccurrenceRecord => ({
        id: this.createId(),
        recurringTransactionId: rule.id,
        scheduledDate,
        status: 'pending',
        type: rule.type,
        amount: rule.amount,
        currency: rule.currency,
        accountId: rule.accountId,
        destinationAccountId: rule.destinationAccountId,
        categoryId: rule.categoryId,
        subcategoryId: rule.subcategoryId,
        note: rule.note,
        transactionId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      } as RecurringOccurrenceRecord));
      await this.repository.insertOccurrencesAndAdvance(
        rule.id,
        occurrences,
        result.nextDate,
        timestamp,
      );
      generated += occurrences.length;
      if (result.limited) limitedRules += 1;
      if (rule.endDate && result.nextDate > rule.endDate) {
        await this.repository.updateRuleLifecycle(rule.id, {
          isActive: false,
          endedAt: timestamp,
          nextOccurrenceDate: result.nextDate,
          updatedAt: timestamp,
        });
      }
    }
    if (generated || dueRules.length) notifyRecurringDataChanged();
    return { generated, limitedRules };
  }

  async pauseRule(id: string): Promise<void> {
    const rule = await this.requireRule(id);
    if (rule.endedAt) throw new RecurringActionError('rule_ended', getMessages().recurring.hasEnded);
    await this.repository.updateRuleLifecycle(id, {
      isActive: false,
      endedAt: null,
      nextOccurrenceDate: rule.nextOccurrenceDate,
      updatedAt: this.now(),
    });
    notifyRecurringDataChanged();
  }

  async resumeRule(id: string): Promise<void> {
    const rule = await this.requireRule(id);
    if (rule.endedAt) throw new RecurringActionError('rule_ended', getMessages().recurring.endedCannotResume);
    const nextOccurrenceDate = firstScheduledOnOrAfter(
      rule.startDate,
      this.today(),
      rule.frequency,
      rule.interval,
    );
    const timestamp = this.now();
    if (rule.endDate && nextOccurrenceDate > rule.endDate) {
      await this.repository.updateRuleLifecycle(id, {
        isActive: false,
        endedAt: timestamp,
        nextOccurrenceDate,
        updatedAt: timestamp,
      });
    } else {
      await this.repository.updateRuleLifecycle(id, {
        isActive: true,
        endedAt: null,
        nextOccurrenceDate,
        updatedAt: timestamp,
      });
    }
    notifyRecurringDataChanged();
  }

  async endRule(id: string): Promise<void> {
    const rule = await this.requireRule(id);
    if (rule.endedAt) return;
    const timestamp = this.now();
    await this.repository.updateRuleLifecycle(id, {
      isActive: false,
      endedAt: timestamp,
      nextOccurrenceDate: rule.nextOccurrenceDate,
      updatedAt: timestamp,
    });
    notifyRecurringDataChanged();
  }

  async updateOccurrence(
    id: string,
    shape: RecurringTransactionShape & { scheduledDate: string },
  ): Promise<void> {
    const current = await this.requirePendingOccurrence(id);
    if (!isValidCalendarDate(shape.scheduledDate)) {
      throw new RecurringRuleValidationError({ startDate: getMessages().recurring.errorDateFormat });
    }
    const { shape: normalizedShape, currency } = await this.validateShape(shape, shape.scheduledDate);
    if (!(await this.repository.updatePendingOccurrence(id, {
      ...normalizedShape,
      currency,
      scheduledDate: shape.scheduledDate,
      updatedAt: this.now(),
    }))) {
      await this.throwOccurrenceWriteFailure(id);
    }
    notifyRecurringDataChanged();
    void current;
  }

  async skipOccurrence(id: string): Promise<void> {
    await this.requirePendingOccurrence(id);
    if (!(await this.repository.skipPendingOccurrence(id, this.now()))) {
      await this.throwOccurrenceWriteFailure(id);
    }
    notifyRecurringDataChanged();
  }

  async confirmOccurrence(id: string) {
    const occurrence = await this.requirePendingOccurrence(id);
    // An occurrence in a currency other than the base captures its own rate
    // snapshot at posting time. Without a valid rate, posting is blocked — it never
    // posts a zero base amount.
    const baseCurrency = this.baseCurrency();
    let exchangeRate: ExchangeRateSnapshotInput | null = null;
    if (occurrence.currency !== baseCurrency && occurrence.type !== 'transfer') {
      exchangeRate = await this.resolveExchangeRate(occurrence.currency);
      if (!exchangeRate) {
        throw new RecurringActionError(
          'missing_exchange_rate',
          getMessages().recurring.missingExchangeRate(occurrence.currency, baseCurrency),
        );
      }
    }
    const input = this.toTransactionInput(occurrence, exchangeRate);
    const timestamp = this.now();
    const transaction = await this.transactions.create(
      input,
      async (record) => {
        if (!(await this.repository.postPendingOccurrence(id, record, timestamp))) {
          throw new RecurringActionError(
            'occurrence_not_pending',
            getMessages().recurring.alreadyHandled,
          );
        }
      },
    );
    notifyRecurringDataChanged();
    return transaction;
  }

  private async validateRule(
    input: RecurringRuleInput,
  ): Promise<{ input: RecurringRuleInput; currency: CurrencyCode }> {
    const { shape: normalizedShape, currency } = await this.validateShape(input, input.startDate);
    const t = getMessages().recurring;
    const errors: RecurringRuleValidationErrors = {};
    if (!recurringFrequencies.includes(input.frequency)) errors.frequency = t.errorFrequency;
    if (!Number.isInteger(input.interval) || input.interval < 1) {
      errors.interval = t.errorInterval;
    }
    if (!isValidCalendarDate(input.startDate)) errors.startDate = t.errorStartDate;
    if (input.endDate && !isValidCalendarDate(input.endDate)) errors.endDate = t.errorEndDate;
    if (input.endDate && input.startDate && input.endDate < input.startDate) {
      errors.endDate = t.errorEndBeforeStart;
    }
    if (Object.keys(errors).length) throw new RecurringRuleValidationError(errors);
    return {
      input: {
        ...normalizedShape,
        frequency: input.frequency,
        interval: input.interval,
        startDate: input.startDate,
        endDate: input.endDate?.trim() || null,
      },
      currency,
    };
  }

  private async validateShape<T extends RecurringTransactionShape>(
    input: T,
    transactionDate: string,
  ): Promise<{ shape: T; currency: CurrencyCode }> {
    // Recurring transfers are same-currency only: the destination leg is left for the
    // service to derive, so a cross-currency pair surfaces as a rate/leg error which
    // we translate into a clear "not supported" message.
    const transactionInput: TransactionInput = { ...input, transactionDate };
    try {
      const normalized = await this.transactions.validateTemplate(transactionInput);
      if (normalized.type === 'transfer' && normalized.currency !== normalized.destinationCurrencyCode) {
        throw new RecurringRuleValidationError({
          destinationAccountId: getMessages().recurring.errorCrossCurrencyTransfer,
        });
      }
      const shape = (normalized.type === 'transfer'
        ? {
            type: 'transfer' as const,
            amount: normalized.amount,
            accountId: normalized.accountId,
            destinationAccountId: normalized.destinationAccountId,
            categoryId: null,
            subcategoryId: null,
            note: normalized.note,
          }
        : {
            type: normalized.type,
            amount: normalized.amount,
            accountId: normalized.accountId,
            // validateTemplate already resolved the pair, so a rule created from a
            // subcategory stores the parent in categoryId, exactly like a transaction.
            categoryId: normalized.categoryId,
            subcategoryId: normalized.subcategoryId,
            destinationAccountId: null,
            note: normalized.note,
          }) as T;
      return { shape, currency: normalized.currency };
    } catch (cause) {
      if (isRecurringRuleValidationError(cause)) throw cause;
      if (!isTransactionValidationError(cause)) throw cause;
      // A transfer that fails only on the destination leg/rate is a cross-currency pair.
      if (input.type === 'transfer' && (cause.fields.destinationAmount || cause.fields.exchangeRate)) {
        throw new RecurringRuleValidationError({
          destinationAccountId: getMessages().recurring.errorCrossCurrencyTransfer,
        });
      }
      const { transactionDate: dateError, ...fields } = cause.fields;
      throw new RecurringRuleValidationError({
        ...fields,
        startDate: dateError,
      });
    }
  }

  private toTransactionInput(
    occurrence: RecurringOccurrenceListItem,
    exchangeRate: ExchangeRateSnapshotInput | null,
  ): TransactionInput {
    if (occurrence.type === 'transfer') {
      // Recurring transfers are same-currency; the service derives the destination leg.
      return {
        type: 'transfer',
        amount: occurrence.amount,
        accountId: occurrence.accountId,
        destinationAccountId: occurrence.destinationAccountId,
        categoryId: null,
        transactionDate: occurrence.scheduledDate,
        note: occurrence.note,
      };
    }
    return {
      type: occurrence.type,
      amount: occurrence.amount,
      accountId: occurrence.accountId,
      categoryId: occurrence.categoryId,
      subcategoryId: occurrence.subcategoryId,
      destinationAccountId: null,
      transactionDate: occurrence.scheduledDate,
      note: occurrence.note,
      exchangeRate,
    };
  }

  private async requireRule(id: string) {
    const rule = await this.repository.findRule(id);
    if (!rule) throw new RecurringActionError('rule_not_found', getMessages().recurring.ruleNotFound);
    return rule;
  }

  private async requirePendingOccurrence(id: string) {
    const occurrence = await this.repository.findOccurrence(id);
    if (!occurrence) {
      throw new RecurringActionError('occurrence_not_found', getMessages().recurring.occurrenceNotFound);
    }
    if (occurrence.status !== 'pending') {
      throw new RecurringActionError('occurrence_not_pending', getMessages().recurring.alreadyHandled);
    }
    return occurrence;
  }

  private async throwOccurrenceWriteFailure(id: string): Promise<never> {
    const occurrence = await this.repository.findOccurrence(id);
    if (!occurrence) {
      throw new RecurringActionError('occurrence_not_found', getMessages().recurring.occurrenceNotFound);
    }
    throw new RecurringActionError('occurrence_not_pending', getMessages().recurring.alreadyHandled);
  }
}

function dayAfter(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}
