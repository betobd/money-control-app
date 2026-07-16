import { and, asc, desc, eq, isNull, lte, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';

import { database } from '@/database/client';
import {
  accounts,
  categories,
  recurringOccurrences,
  recurringTransactions,
  transactions,
} from '@/database/schema';
import type { TransactionRecord } from '@/features/transactions/transaction.types';
import type { RecurringTransactionRepository } from './recurring-transaction.repository';
import type {
  RecurringOccurrenceListItem,
  RecurringOccurrenceRecord,
  RecurringRuleListItem,
  RecurringRuleRecord,
  RecurringTransactionShape,
} from './recurring-transaction.types';

const destinationAccounts = alias(accounts, 'recurring_destination_accounts');

const ruleSelection = {
  rule: recurringTransactions,
  accountName: accounts.name,
  destinationAccountName: destinationAccounts.name,
  categoryName: categories.name,
};

const occurrenceSelection = {
  occurrence: recurringOccurrences,
  accountName: accounts.name,
  destinationAccountName: destinationAccounts.name,
  categoryName: categories.name,
};

function mapRule(row: {
  rule: typeof recurringTransactions.$inferSelect;
  accountName: string;
  destinationAccountName: string | null;
  categoryName: string | null;
}): RecurringRuleListItem {
  return {
    ...row.rule,
    currency: 'COP',
    type: row.rule.type as RecurringRuleRecord['type'],
    frequency: row.rule.frequency as RecurringRuleRecord['frequency'],
    accountName: row.accountName,
    destinationAccountName: row.destinationAccountName,
    categoryName: row.categoryName,
  } as RecurringRuleListItem;
}

function mapOccurrence(row: {
  occurrence: typeof recurringOccurrences.$inferSelect;
  accountName: string;
  destinationAccountName: string | null;
  categoryName: string | null;
}): RecurringOccurrenceListItem {
  return {
    ...row.occurrence,
    currency: 'COP',
    type: row.occurrence.type as RecurringOccurrenceRecord['type'],
    status: row.occurrence.status as RecurringOccurrenceRecord['status'],
    accountName: row.accountName,
    destinationAccountName: row.destinationAccountName,
    categoryName: row.categoryName,
  } as RecurringOccurrenceListItem;
}

export class SQLiteRecurringTransactionRepository implements RecurringTransactionRepository {
  async createRule(rule: RecurringRuleRecord): Promise<void> {
    await database.insert(recurringTransactions).values(rule);
  }

  async updateRule(id: string, rule: RecurringRuleRecord): Promise<void> {
    await database
      .update(recurringTransactions)
      .set({
        type: rule.type,
        amount: rule.amount,
        accountId: rule.accountId,
        destinationAccountId: rule.destinationAccountId,
        categoryId: rule.categoryId,
        note: rule.note,
        frequency: rule.frequency,
        interval: rule.interval,
        startDate: rule.startDate,
        nextOccurrenceDate: rule.nextOccurrenceDate,
        endDate: rule.endDate,
        isActive: rule.isActive,
        endedAt: rule.endedAt,
        updatedAt: rule.updatedAt,
      })
      .where(eq(recurringTransactions.id, id));
  }

  async findRule(id: string): Promise<RecurringRuleListItem | null> {
    const rows = await this.ruleQuery(eq(recurringTransactions.id, id));
    return rows[0] ? mapRule(rows[0]) : null;
  }

  async listRules(): Promise<RecurringRuleListItem[]> {
    const rows = await this.ruleQuery();
    return rows.map(mapRule);
  }

  async listDueRules(throughDate: string): Promise<RecurringRuleRecord[]> {
    const rows = await database
      .select()
      .from(recurringTransactions)
      .where(and(
        eq(recurringTransactions.isActive, true),
        isNull(recurringTransactions.endedAt),
        lte(recurringTransactions.nextOccurrenceDate, throughDate),
      ))
      .orderBy(asc(recurringTransactions.nextOccurrenceDate), asc(recurringTransactions.id));
    return rows.map((row) => ({
      ...row,
      currency: 'COP',
      type: row.type as RecurringRuleRecord['type'],
      frequency: row.frequency as RecurringRuleRecord['frequency'],
    } as RecurringRuleRecord));
  }

  async findLatestScheduledDate(ruleId: string): Promise<string | null> {
    const [row] = await database
      .select({ scheduledDate: recurringOccurrences.scheduledDate })
      .from(recurringOccurrences)
      .where(eq(recurringOccurrences.recurringTransactionId, ruleId))
      .orderBy(desc(recurringOccurrences.scheduledDate))
      .limit(1);
    return row?.scheduledDate ?? null;
  }

  async insertOccurrencesAndAdvance(
    ruleId: string,
    occurrences: RecurringOccurrenceRecord[],
    nextOccurrenceDate: string,
    updatedAt: string,
  ): Promise<void> {
    await database.transaction(async (tx) => {
      if (occurrences.length) {
        await tx.insert(recurringOccurrences).values(occurrences).onConflictDoNothing({
          target: [
            recurringOccurrences.recurringTransactionId,
            recurringOccurrences.scheduledDate,
          ],
        });
      }
      await tx
        .update(recurringTransactions)
        .set({ nextOccurrenceDate, updatedAt })
        .where(eq(recurringTransactions.id, ruleId));
    });
  }

  async updateRuleLifecycle(
    id: string,
    state: Pick<RecurringRuleRecord, 'isActive' | 'endedAt' | 'nextOccurrenceDate' | 'updatedAt'>,
  ): Promise<boolean> {
    const rows = await database
      .update(recurringTransactions)
      .set(state)
      .where(eq(recurringTransactions.id, id))
      .returning({ id: recurringTransactions.id });
    return rows.length === 1;
  }

  async findOccurrence(id: string): Promise<RecurringOccurrenceListItem | null> {
    const rows = await this.occurrenceQuery(eq(recurringOccurrences.id, id), 1);
    return rows[0] ? mapOccurrence(rows[0]) : null;
  }

  async listPendingDue(throughDate: string): Promise<RecurringOccurrenceListItem[]> {
    const rows = await this.occurrenceQuery(and(
      eq(recurringOccurrences.status, 'pending'),
      lte(recurringOccurrences.scheduledDate, throughDate),
    ));
    return rows.map(mapOccurrence);
  }

  async listRecentOccurrences(limit: number): Promise<RecurringOccurrenceListItem[]> {
    const rows = await this.occurrenceQuery(
      sql<boolean>`${recurringOccurrences.status} <> 'pending'`,
      limit,
    );
    return rows.map(mapOccurrence);
  }

  async updatePendingOccurrence(
    id: string,
    occurrence: RecurringTransactionShape & { scheduledDate: string; updatedAt: string },
  ): Promise<boolean> {
    const rows = await database
      .update(recurringOccurrences)
      .set({
        type: occurrence.type,
        amount: occurrence.amount,
        accountId: occurrence.accountId,
        destinationAccountId: occurrence.destinationAccountId,
        categoryId: occurrence.categoryId,
        note: occurrence.note,
        scheduledDate: occurrence.scheduledDate,
        updatedAt: occurrence.updatedAt,
      })
      .where(and(
        eq(recurringOccurrences.id, id),
        eq(recurringOccurrences.status, 'pending'),
      ))
      .returning({ id: recurringOccurrences.id });
    return rows.length === 1;
  }

  async skipPendingOccurrence(id: string, updatedAt: string): Promise<boolean> {
    const rows = await database
      .update(recurringOccurrences)
      .set({ status: 'skipped', updatedAt })
      .where(and(
        eq(recurringOccurrences.id, id),
        eq(recurringOccurrences.status, 'pending'),
      ))
      .returning({ id: recurringOccurrences.id });
    return rows.length === 1;
  }

  async postPendingOccurrence(
    occurrenceId: string,
    transaction: TransactionRecord,
    updatedAt: string,
  ): Promise<boolean> {
    return database.transaction(async (tx) => {
      const [pending] = await tx
        .select({ id: recurringOccurrences.id })
        .from(recurringOccurrences)
        .where(and(
          eq(recurringOccurrences.id, occurrenceId),
          eq(recurringOccurrences.status, 'pending'),
        ))
        .limit(1);
      if (!pending) return false;

      await tx.insert(transactions).values(transaction);
      const updated = await tx
        .update(recurringOccurrences)
        .set({ status: 'posted', transactionId: transaction.id, updatedAt })
        .where(and(
          eq(recurringOccurrences.id, occurrenceId),
          eq(recurringOccurrences.status, 'pending'),
        ))
        .returning({ id: recurringOccurrences.id });
      if (updated.length !== 1) throw new Error('Recurring occurrence changed during confirmation.');
      return true;
    });
  }

  private ruleQuery(condition?: ReturnType<typeof eq>) {
    return database
      .select(ruleSelection)
      .from(recurringTransactions)
      .innerJoin(accounts, eq(recurringTransactions.accountId, accounts.id))
      .leftJoin(destinationAccounts, eq(recurringTransactions.destinationAccountId, destinationAccounts.id))
      .leftJoin(categories, eq(recurringTransactions.categoryId, categories.id))
      .where(condition)
      .orderBy(
        desc(recurringTransactions.isActive),
        asc(recurringTransactions.endedAt),
        asc(recurringTransactions.nextOccurrenceDate),
        desc(recurringTransactions.createdAt),
      );
  }

  private occurrenceQuery(condition?: ReturnType<typeof and>, limit?: number) {
    const query = database
      .select(occurrenceSelection)
      .from(recurringOccurrences)
      .innerJoin(accounts, eq(recurringOccurrences.accountId, accounts.id))
      .leftJoin(destinationAccounts, eq(recurringOccurrences.destinationAccountId, destinationAccounts.id))
      .leftJoin(categories, eq(recurringOccurrences.categoryId, categories.id))
      .where(condition)
      .orderBy(desc(recurringOccurrences.scheduledDate), desc(recurringOccurrences.createdAt));
    return limit === undefined ? query : query.limit(limit);
  }
}
