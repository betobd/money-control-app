import { and, eq, ne, or, sql } from 'drizzle-orm';

import { database } from '@/database/client';
import {
  accounts,
  recurringOccurrences,
  recurringTransactions,
  transactionSplits,
  transactions,
} from '@/database/schema';
import type { AccountDeletionEligibility, AccountRepository, AccountUpdateRecord, NewAccountRecord } from './account.repository';
import type { Account, AccountType, AccountWithBalance } from './account.types';

type AccountRow = typeof accounts.$inferSelect;

function mapAccount(row: AccountRow): Account {
  return {
    ...row,
    type: row.type as AccountType,
    currency: 'COP',
  };
}

export class SQLiteAccountRepository implements AccountRepository {
  async list(includeArchived: boolean): Promise<AccountWithBalance[]> {
    const balance = sql<number>`
      ${accounts.openingBalance} + coalesce(sum(
        case
          when ${transactions.status} <> 'posted' then 0
          when ${transactions.type} = 'income' and ${transactions.accountId} = ${accounts.id} then ${transactions.amount}
          when ${transactions.type} = 'expense' and ${transactions.accountId} = ${accounts.id} then -${transactions.amount}
          when ${transactions.type} = 'transfer' and ${transactions.accountId} = ${accounts.id} then -${transactions.amount}
          when ${transactions.type} = 'transfer' and ${transactions.destinationAccountId} = ${accounts.id} then ${transactions.amount}
          else 0
        end
      ), 0)
    `.mapWith(Number);

    const rows = await database
      .select({ account: accounts, balance })
      .from(accounts)
      .leftJoin(
        transactions,
        or(eq(transactions.accountId, accounts.id), eq(transactions.destinationAccountId, accounts.id)),
      )
      .where(includeArchived ? undefined : eq(accounts.isArchived, false))
      .groupBy(accounts.id)
      .orderBy(accounts.isArchived, accounts.createdAt);

    return rows.map(({ account, balance: currentBalance }) => ({
      ...mapAccount(account),
      balance: currentBalance,
    }));
  }

  async findById(id: string): Promise<Account | null> {
    const row = await database.query.accounts.findFirst({ where: eq(accounts.id, id) });
    return row ? mapAccount(row) : null;
  }

  async getDeletionEligibility(id: string): Promise<AccountDeletionEligibility> {
    const account = (await this.list(true)).find((candidate) => candidate.id === id) ?? null;
    if (!account) return { account: null, hasFinancialReferences: false };

    const [transactionReference, splitReference, recurringReference, occurrenceReference] = await Promise.all([
      database
        .select({ id: transactions.id })
        .from(transactions)
        .where(or(eq(transactions.accountId, id), eq(transactions.destinationAccountId, id)))
        .limit(1),
      database
        .select({ id: transactionSplits.id })
        .from(transactionSplits)
        .where(eq(transactionSplits.accountId, id))
        .limit(1),
      database
        .select({ id: recurringTransactions.id })
        .from(recurringTransactions)
        .where(or(eq(recurringTransactions.accountId, id), eq(recurringTransactions.destinationAccountId, id)))
        .limit(1),
      database
        .select({ id: recurringOccurrences.id })
        .from(recurringOccurrences)
        .where(or(
          eq(recurringOccurrences.accountId, id),
          eq(recurringOccurrences.destinationAccountId, id),
        ))
        .limit(1),
    ]);

    return {
      account,
      hasFinancialReferences: Boolean(
        transactionReference[0] || splitReference[0] || recurringReference[0] || occurrenceReference[0],
      ),
    };
  }

  async findActiveByNormalizedName(normalizedName: string, excludingId?: string): Promise<Account | null> {
    const conditions = [
      eq(accounts.isArchived, false),
      sql`lower(trim(${accounts.name})) = ${normalizedName}`,
    ];
    if (excludingId) conditions.push(ne(accounts.id, excludingId));

    const [row] = await database.select().from(accounts).where(and(...conditions)).limit(1);
    return row ? mapAccount(row) : null;
  }

  async hasPostedTransactions(id: string): Promise<boolean> {
    const [row] = await database
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.status, 'posted'),
          or(eq(transactions.accountId, id), eq(transactions.destinationAccountId, id)),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async create(account: NewAccountRecord): Promise<void> {
    await database.insert(accounts).values(account);
  }

  async update(id: string, account: AccountUpdateRecord): Promise<void> {
    await database.update(accounts).set(account).where(eq(accounts.id, id));
  }

  async archive(id: string, archivedAt: string): Promise<void> {
    await database
      .update(accounts)
      .set({ isArchived: true, archivedAt, updatedAt: archivedAt })
      .where(eq(accounts.id, id));
  }

  async restore(id: string, restoredAt: string): Promise<void> {
    await database
      .update(accounts)
      .set({ isArchived: false, archivedAt: null, updatedAt: restoredAt })
      .where(eq(accounts.id, id));
  }

  async permanentlyDelete(id: string): Promise<void> {
    await database.delete(accounts).where(eq(accounts.id, id));
  }
}
