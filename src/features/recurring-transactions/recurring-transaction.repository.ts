import type { TransactionRecord } from '@/features/transactions/transaction.types';
import type {
  RecurringOccurrenceListItem,
  RecurringOccurrenceRecord,
  RecurringRuleListItem,
  RecurringRuleRecord,
  RecurringTransactionShape,
} from './recurring-transaction.types';

export interface RecurringTransactionRepository {
  createRule(rule: RecurringRuleRecord): Promise<void>;
  updateRule(id: string, rule: RecurringRuleRecord): Promise<void>;
  findRule(id: string): Promise<RecurringRuleListItem | null>;
  listRules(): Promise<RecurringRuleListItem[]>;
  listDueRules(throughDate: string): Promise<RecurringRuleRecord[]>;
  findLatestScheduledDate(ruleId: string): Promise<string | null>;
  insertOccurrencesAndAdvance(
    ruleId: string,
    occurrences: RecurringOccurrenceRecord[],
    nextOccurrenceDate: string,
    updatedAt: string,
  ): Promise<void>;
  updateRuleLifecycle(
    id: string,
    state: Pick<RecurringRuleRecord, 'isActive' | 'endedAt' | 'nextOccurrenceDate' | 'updatedAt'>,
  ): Promise<boolean>;
  findOccurrence(id: string): Promise<RecurringOccurrenceListItem | null>;
  listPendingDue(throughDate: string): Promise<RecurringOccurrenceListItem[]>;
  listRecentOccurrences(limit: number): Promise<RecurringOccurrenceListItem[]>;
  updatePendingOccurrence(
    id: string,
    occurrence: RecurringTransactionShape & { scheduledDate: string; updatedAt: string },
  ): Promise<boolean>;
  skipPendingOccurrence(id: string, updatedAt: string): Promise<boolean>;
  postPendingOccurrence(
    occurrenceId: string,
    transaction: TransactionRecord,
    updatedAt: string,
  ): Promise<boolean>;
}
