import {
  and,
  asc,
  eq,
  gt,
  gte,
  inArray,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';

import { database } from '@/database/client';
import {
  accounts,
  categories,
  creditCardStatements,
  recurringOccurrences,
  transactions,
} from '@/database/schema';
import type { CreditCardPaymentRecord } from '@/features/credit-cards/credit-card.repository';
import type { CreditCardStatement } from '@/features/credit-cards/credit-card.types';
import { ExportRowLimitError, type DataExportRepository } from './data-export.repository';
import type {
  CreditCardStatementExportSource,
  TransactionExportCount,
  TransactionExportQuery,
  TransactionExportRow,
} from './data-export.types';

const destinationAccounts = alias(accounts, 'export_destination_accounts');
const originalTransactions = alias(transactions, 'export_original_transactions');
const originalCategories = alias(categories, 'export_original_categories');
const subcategories = alias(categories, 'export_subcategories');
const originalSubcategories = alias(categories, 'export_original_subcategories');

type TransactionCursor = {
  transactionDate: string;
  createdAt: string;
  id: string;
};

function transactionConditions(
  query: TransactionExportQuery,
  cursor?: TransactionCursor,
): SQL[] {
  const conditions: SQL[] = [];
  if (query.types?.length) conditions.push(inArray(transactions.type, query.types));
  if (query.statuses?.length) conditions.push(inArray(transactions.status, query.statuses));
  if (query.accountId) {
    conditions.push(or(
      eq(transactions.accountId, query.accountId),
      eq(transactions.destinationAccountId, query.accountId),
    )!);
  }
  if (query.categoryId) {
    conditions.push(or(
      eq(transactions.categoryId, query.categoryId),
      eq(transactions.subcategoryId, query.categoryId),
      sql<boolean>`exists (
        select 1 from transactions export_original_filter
        where export_original_filter.id = ${transactions.originalTransactionId}
          and (export_original_filter.category_id = ${query.categoryId}
            or export_original_filter.subcategory_id = ${query.categoryId})
      )`,
    )!);
  }
  if (query.dateFrom) conditions.push(gte(transactions.transactionDate, query.dateFrom));
  if (query.dateTo) conditions.push(lte(transactions.transactionDate, query.dateTo));
  if (cursor) {
    conditions.push(or(
      gt(transactions.transactionDate, cursor.transactionDate),
      and(
        eq(transactions.transactionDate, cursor.transactionDate),
        gt(transactions.createdAt, cursor.createdAt),
      ),
      and(
        eq(transactions.transactionDate, cursor.transactionDate),
        eq(transactions.createdAt, cursor.createdAt),
        gt(transactions.id, cursor.id),
      ),
    )!);
  }
  return conditions;
}

export class SQLiteDataExportRepository implements DataExportRepository {
  async countTransactions(query: TransactionExportQuery): Promise<TransactionExportCount> {
    const conditions = transactionConditions(query);
    const [row] = await database
      .select({
        count: sql<number>`count(*)`,
        oldestDate: sql<string | null>`min(${transactions.transactionDate})`,
        newestDate: sql<string | null>`max(${transactions.transactionDate})`,
      })
      .from(transactions)
      .where(conditions.length ? and(...conditions) : undefined);
    return {
      count: Number(row?.count ?? 0),
      oldestDate: row?.oldestDate ?? null,
      newestDate: row?.newestDate ?? null,
    };
  }

  async *iterateTransactions(
    query: TransactionExportQuery,
    batchSize: number,
    maximumRows: number,
  ): AsyncIterable<TransactionExportRow> {
    let cursor: TransactionCursor | undefined;
    let emitted = 0;

    while (true) {
      const conditions = transactionConditions(query, cursor);
      const rows = await database
        .select({
          transaction: transactions,
          sourceAccountName: accounts.name,
          destinationAccountName: destinationAccounts.name,
          categoryId: sql<string | null>`coalesce(${transactions.categoryId}, ${originalTransactions.categoryId})`,
          categoryName: sql<string | null>`coalesce(${categories.name}, ${originalCategories.name})`,
          subcategoryId: sql<string | null>`coalesce(${transactions.subcategoryId}, ${originalTransactions.subcategoryId})`,
          subcategoryName: sql<string | null>`coalesce(${subcategories.name}, ${originalSubcategories.name})`,
          originalTransactionDate: originalTransactions.transactionDate,
          originalTransactionAmount: originalTransactions.amount,
          originalTransactionNote: originalTransactions.note,
          recurringOccurrenceId: recurringOccurrences.id,
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(destinationAccounts, eq(transactions.destinationAccountId, destinationAccounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(subcategories, eq(transactions.subcategoryId, subcategories.id))
        .leftJoin(originalTransactions, eq(transactions.originalTransactionId, originalTransactions.id))
        .leftJoin(originalCategories, eq(originalTransactions.categoryId, originalCategories.id))
        .leftJoin(originalSubcategories, eq(originalTransactions.subcategoryId, originalSubcategories.id))
        .leftJoin(recurringOccurrences, eq(recurringOccurrences.transactionId, transactions.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(
          asc(transactions.transactionDate),
          asc(transactions.createdAt),
          asc(transactions.id),
        )
        .limit(batchSize);

      if (rows.length === 0) return;
      for (const row of rows) {
        emitted += 1;
        if (emitted > maximumRows) {
          throw new ExportRowLimitError(
            `The transaction export exceeds the ${maximumRows.toLocaleString('en-US')} row limit.`,
          );
        }
        const transaction = row.transaction;
        yield {
          transactionId: transaction.id,
          transactionDate: transaction.transactionDate,
          type: transaction.type as TransactionExportRow['type'],
          status: transaction.status as TransactionExportRow['status'],
          currencyCode: transaction.currency,
          amountCop: transaction.amount,
          baseCurrencyAmountCop: transaction.baseAmountMinor,
          exchangeRate: transaction.exchangeRateScaled !== null && transaction.exchangeRateScale
            ? transaction.exchangeRateScaled / transaction.exchangeRateScale
            : null,
          exchangeRateDate: transaction.exchangeRateDate,
          exchangeRateSource: transaction.exchangeRateSource,
          destinationAmountMinor: transaction.destinationAmountMinor,
          destinationCurrencyCode: transaction.destinationCurrencyCode,
          categoryId: transaction.type === 'transfer' ? null : row.categoryId,
          categoryName: transaction.type === 'transfer' ? null : row.categoryName,
          subcategoryId: transaction.type === 'transfer' ? null : row.subcategoryId,
          subcategoryName: transaction.type === 'transfer' ? null : row.subcategoryName,
          originalTransactionId: transaction.originalTransactionId,
          originalTransactionDate: row.originalTransactionDate,
          originalTransactionAmountCop: row.originalTransactionAmount,
          originalTransactionNote: row.originalTransactionNote,
          sourceAccountId: transaction.accountId!,
          sourceAccountName: row.sourceAccountName,
          destinationAccountId: transaction.destinationAccountId,
          destinationAccountName: row.destinationAccountName,
          note: transaction.note,
          recurringOccurrenceId: row.recurringOccurrenceId,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
        };
      }

      const last = rows.at(-1)!.transaction;
      cursor = {
        transactionDate: last.transactionDate,
        createdAt: last.createdAt,
        id: last.id,
      };
      if (rows.length < batchSize) return;
    }
  }

  async countCreditCardStatements(): Promise<number> {
    const [row] = await database
      .select({ count: sql<number>`count(*)` })
      .from(creditCardStatements);
    return Number(row?.count ?? 0);
  }

  async listCreditCardStatementSources(): Promise<CreditCardStatementExportSource[]> {
    const statementRows = await database
      .select({ statement: creditCardStatements, cardName: accounts.name })
      .from(creditCardStatements)
      .innerJoin(accounts, eq(creditCardStatements.accountId, accounts.id))
      .orderBy(
        asc(creditCardStatements.closingDate),
        asc(creditCardStatements.createdAt),
        asc(creditCardStatements.id),
      );
    if (statementRows.length === 0) return [];

    const accountIds = [...new Set(statementRows.map((row) => row.statement.accountId))];
    const paymentRows = await database
      .select({
        id: transactions.id,
        accountId: transactions.destinationAccountId,
        amount: transactions.amount,
        transactionDate: transactions.transactionDate,
      })
      .from(transactions)
      .where(and(
        eq(transactions.type, 'transfer'),
        eq(transactions.status, 'posted'),
        inArray(transactions.destinationAccountId, accountIds),
      ))
      .orderBy(
        asc(transactions.transactionDate),
        asc(transactions.createdAt),
        asc(transactions.id),
      );

    const paymentsByAccount = new Map<string, CreditCardPaymentRecord[]>();
    for (const row of paymentRows) {
      if (!row.accountId) continue;
      const values = paymentsByAccount.get(row.accountId) ?? [];
      values.push({ id: row.id, amount: row.amount, transactionDate: row.transactionDate });
      paymentsByAccount.set(row.accountId, values);
    }

    return statementRows.map((row) => ({
      statement: row.statement as CreditCardStatement,
      cardName: row.cardName,
      payments: paymentsByAccount.get(row.statement.accountId) ?? [],
    }));
  }
}
