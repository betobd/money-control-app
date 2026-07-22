import { bogotaToday, isValidCalendarDate } from '@/features/transactions/transaction-date';
import {
  TransactionValidationError,
  type TransactionService,
} from '@/features/transactions/transaction.service';
import type { TransactionInput } from '@/features/transactions/transaction.types';
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
  constructor(public readonly fields: RecurringRuleValidationErrors) {
    super('Recurring transaction validation failed.');
  }
}

export type RecurringActionErrorCode =
  | 'rule_not_found'
  | 'rule_ended'
  | 'occurrence_not_found'
  | 'occurrence_not_pending';

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
    const normalized = await this.validateRule(input);
    const timestamp = this.now();
    const rule: RecurringRuleRecord = {
      ...normalized,
      id: this.createId(),
      currency: 'COP',
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
      throw new RecurringActionError('rule_ended', 'Ended recurring transactions cannot be edited.');
    }
    const normalized = await this.validateRule(input);
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
        currency: 'COP',
        accountId: rule.accountId,
        destinationAccountId: rule.destinationAccountId,
        categoryId: rule.categoryId,
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
    if (rule.endedAt) throw new RecurringActionError('rule_ended', 'This recurring transaction has ended.');
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
    if (rule.endedAt) throw new RecurringActionError('rule_ended', 'Ended recurring transactions cannot resume.');
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
      throw new RecurringRuleValidationError({ startDate: 'Enter a valid date in YYYY-MM-DD format.' });
    }
    const normalized = await this.validateShape(shape, shape.scheduledDate);
    if (!(await this.repository.updatePendingOccurrence(id, {
      ...normalized,
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
    const input = this.toTransactionInput(occurrence);
    const timestamp = this.now();
    const transaction = await this.transactions.create(
      input,
      async (record) => {
        if (!(await this.repository.postPendingOccurrence(id, record, timestamp))) {
          throw new RecurringActionError(
            'occurrence_not_pending',
            'This recurring occurrence was already handled.',
          );
        }
      },
    );
    notifyRecurringDataChanged();
    return transaction;
  }

  private async validateRule(input: RecurringRuleInput): Promise<RecurringRuleInput> {
    const normalizedShape = await this.validateShape(input, input.startDate);
    const errors: RecurringRuleValidationErrors = {};
    if (!recurringFrequencies.includes(input.frequency)) errors.frequency = 'Select a supported frequency.';
    if (!Number.isInteger(input.interval) || input.interval < 1) {
      errors.interval = 'Interval must be a positive whole number.';
    }
    if (!isValidCalendarDate(input.startDate)) errors.startDate = 'Enter a valid start date.';
    if (input.endDate && !isValidCalendarDate(input.endDate)) errors.endDate = 'Enter a valid end date.';
    if (input.endDate && input.startDate && input.endDate < input.startDate) {
      errors.endDate = 'End date cannot be earlier than start date.';
    }
    if (Object.keys(errors).length) throw new RecurringRuleValidationError(errors);
    return {
      ...normalizedShape,
      frequency: input.frequency,
      interval: input.interval,
      startDate: input.startDate,
      endDate: input.endDate?.trim() || null,
    };
  }

  private async validateShape<T extends RecurringTransactionShape>(
    input: T,
    transactionDate: string,
  ): Promise<T> {
    const transactionInput: TransactionInput = input.type === 'transfer'
      ? { ...input, transactionDate }
      : { ...input, transactionDate };
    try {
      const normalized = await this.transactions.validateTemplate(transactionInput);
      const { transactionDate: _, ...shape } = normalized;
      void _;
      return shape as T;
    } catch (cause) {
      if (!(cause instanceof TransactionValidationError)) throw cause;
      const { transactionDate: dateError, ...fields } = cause.fields;
      throw new RecurringRuleValidationError({
        ...fields,
        startDate: dateError,
      });
    }
  }

  private toTransactionInput(occurrence: RecurringOccurrenceListItem): TransactionInput {
    if (occurrence.type === 'transfer') {
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
      destinationAccountId: null,
      transactionDate: occurrence.scheduledDate,
      note: occurrence.note,
    };
  }

  private async requireRule(id: string) {
    const rule = await this.repository.findRule(id);
    if (!rule) throw new RecurringActionError('rule_not_found', 'Recurring transaction not found.');
    return rule;
  }

  private async requirePendingOccurrence(id: string) {
    const occurrence = await this.repository.findOccurrence(id);
    if (!occurrence) {
      throw new RecurringActionError('occurrence_not_found', 'Recurring occurrence not found.');
    }
    if (occurrence.status !== 'pending') {
      throw new RecurringActionError('occurrence_not_pending', 'This recurring occurrence was already handled.');
    }
    return occurrence;
  }

  private async throwOccurrenceWriteFailure(id: string): Promise<never> {
    const occurrence = await this.repository.findOccurrence(id);
    if (!occurrence) {
      throw new RecurringActionError('occurrence_not_found', 'Recurring occurrence not found.');
    }
    throw new RecurringActionError('occurrence_not_pending', 'This recurring occurrence was already handled.');
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
