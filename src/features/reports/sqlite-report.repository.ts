import { and, asc, desc, eq, gte, inArray, lt, lte, sql, type SQL } from 'drizzle-orm';

import { database } from '@/database/client';
import { accounts, categories, transactions } from '@/database/schema';
import { alias } from 'drizzle-orm/sqlite-core';
import { convertUsdMinorToCopMinor, type ScaledRate } from '@/features/currency/currency';
import type { ReportRepository } from './report.repository';
import type {
  CategoryExpenseAggregate,
  NetWorthAggregate,
  ReportBucketAggregate,
  ReportGrouping,
  ReportPeriod,
  ReportSummaryAggregate,
} from './report.types';

const UNKNOWN_CATEGORY_ID = 'unknown-category';
const UNKNOWN_CATEGORY_NAME = 'Unknown category';
const UNKNOWN_CATEGORY_ICON = 'other';
const originalTransactions = alias(transactions, 'report_original_transactions');
const originalCategories = alias(categories, 'report_original_categories');

function groupingExpression(grouping: ReportGrouping): SQL<string> {
  return grouping === 'day'
    ? sql<string>`${transactions.transactionDate}`
    : sql<string>`substr(${transactions.transactionDate}, 1, 7)`;
}

function safeInteger(value: unknown, label: string): number {
  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue)) {
    throw new Error(`${label} exceeds the supported safe integer range.`);
  }
  return numberValue;
}

export class SQLiteReportRepository implements ReportRepository {
  async summarize(period: ReportPeriod): Promise<ReportSummaryAggregate> {
    const condition = and(
      eq(transactions.status, 'posted'),
      gte(transactions.transactionDate, period.dateFrom),
      lte(transactions.transactionDate, period.dateTo),
    );
    const [aggregateRows, largestRows] = await Promise.all([
      database
        .select({
          income: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then coalesce(${transactions.baseAmountMinor}, ${transactions.amount}) else 0 end), 0)`,
          grossExpenses: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then coalesce(${transactions.baseAmountMinor}, ${transactions.amount}) else 0 end), 0)`,
          refunds: sql<number>`coalesce(sum(case when ${transactions.type} = 'refund' then coalesce(${transactions.baseAmountMinor}, ${transactions.amount}) else 0 end), 0)`,
          incomeCount: sql<number>`sum(case when ${transactions.type} = 'income' then 1 else 0 end)`,
          expenseCount: sql<number>`sum(case when ${transactions.type} = 'expense' then 1 else 0 end)`,
          refundCount: sql<number>`sum(case when ${transactions.type} = 'refund' then 1 else 0 end)`,
        })
        .from(transactions)
        .where(condition),
      database
        .select({
          amount: sql<number>`coalesce(${transactions.baseAmountMinor}, ${transactions.amount})`,
          categoryName: categories.name,
          accountName: accounts.name,
          transactionDate: transactions.transactionDate,
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(condition, eq(transactions.type, 'expense')))
        .orderBy(sql`coalesce(${transactions.baseAmountMinor}, ${transactions.amount}) desc`, desc(transactions.transactionDate), desc(transactions.id))
        .limit(1),
    ]);

    const aggregate = aggregateRows[0];
    const largest = largestRows[0];
    return {
      income: safeInteger(aggregate?.income ?? 0, 'Report income'),
      grossExpenses: safeInteger(aggregate?.grossExpenses ?? 0, 'Report gross expenses'),
      refunds: safeInteger(aggregate?.refunds ?? 0, 'Report refunds'),
      incomeCount: safeInteger(aggregate?.incomeCount ?? 0, 'Report income count'),
      expenseCount: safeInteger(aggregate?.expenseCount ?? 0, 'Report expense count'),
      refundCount: safeInteger(aggregate?.refundCount ?? 0, 'Report refund count'),
      largestExpense: largest
        ? {
            amount: safeInteger(largest.amount, 'Largest expense'),
            categoryName: largest.categoryName ?? UNKNOWN_CATEGORY_NAME,
            accountName: largest.accountName,
            transactionDate: largest.transactionDate,
          }
        : null,
    };
  }

  async cashFlow(period: ReportPeriod): Promise<ReportBucketAggregate[]> {
    const key = groupingExpression(period.grouping);
    const rows = await database
      .select({
        key,
        income: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then coalesce(${transactions.baseAmountMinor}, ${transactions.amount}) else 0 end), 0)`,
        grossExpenses: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then coalesce(${transactions.baseAmountMinor}, ${transactions.amount}) else 0 end), 0)`,
        refunds: sql<number>`coalesce(sum(case when ${transactions.type} = 'refund' then coalesce(${transactions.baseAmountMinor}, ${transactions.amount}) else 0 end), 0)`,
      })
      .from(transactions)
      .where(and(
        eq(transactions.status, 'posted'),
        inArray(transactions.type, ['income', 'expense', 'refund']),
        gte(transactions.transactionDate, period.dateFrom),
        lte(transactions.transactionDate, period.dateTo),
      ))
      .groupBy(key)
      .orderBy(asc(key));

    return rows.map((row) => ({
      key: row.key,
      income: safeInteger(row.income, 'Cash-flow income'),
      grossExpenses: safeInteger(row.grossExpenses, 'Cash-flow gross expenses'),
      refunds: safeInteger(row.refunds, 'Cash-flow refunds'),
    }));
  }

  async categoryExpenses(period: ReportPeriod): Promise<CategoryExpenseAggregate[]> {
    const effectiveCategoryId = sql<string>`coalesce(${transactions.categoryId}, ${originalTransactions.categoryId})`;
    const total = sql<number>`coalesce(sum(case
      when ${transactions.type} = 'expense' then coalesce(${transactions.baseAmountMinor}, ${transactions.amount})
      when ${transactions.type} = 'refund' then -coalesce(${transactions.baseAmountMinor}, ${transactions.amount})
      else 0 end), 0)`;
    const rows = await database
      .select({
        categoryId: effectiveCategoryId,
        categoryName: sql<string | null>`coalesce(${categories.name}, ${originalCategories.name})`,
        icon: sql<string | null>`coalesce(${categories.icon}, ${originalCategories.icon})`,
        total,
        transactionCount: sql<number>`count(*)`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(originalTransactions, eq(transactions.originalTransactionId, originalTransactions.id))
      .leftJoin(originalCategories, eq(originalTransactions.categoryId, originalCategories.id))
      .where(and(
        eq(transactions.status, 'posted'),
        inArray(transactions.type, ['expense', 'refund']),
        gte(transactions.transactionDate, period.dateFrom),
        lte(transactions.transactionDate, period.dateTo),
      ))
      .groupBy(effectiveCategoryId)
      .orderBy(desc(total), asc(effectiveCategoryId));

    return rows.map((row) => ({
      categoryId: row.categoryId ?? UNKNOWN_CATEGORY_ID,
      categoryName: row.categoryName ?? UNKNOWN_CATEGORY_NAME,
      icon: row.icon ?? UNKNOWN_CATEGORY_ICON,
      total: safeInteger(row.total, 'Category spending'),
      transactionCount: safeInteger(row.transactionCount, 'Category transaction count'),
    }));
  }

  /**
   * Net-worth timeline in COP. COP contributions are exact; USD contributions
   * (opening balances and posted effects, valued in native USD) are converted at
   * the current saved valuation rate — the documented Option A estimate. When no
   * rate exists, USD contributions are excluded. Transfers remain excluded (they
   * are net-worth-neutral within a currency); cross-currency transfer FX drift is
   * an accepted v1 limitation. See docs/decisions/0005-multi-currency-cop-usd.md.
   */
  async netWorth(
    period: ReportPeriod,
    grouping: ReportGrouping,
    valuationRate: ScaledRate | null = null,
  ): Promise<NetWorthAggregate> {
    const key = groupingExpression(grouping);
    const effectFor = (currency: 'COP' | 'USD') => sql<number>`coalesce(sum(
      case
        when ${transactions.currency} = ${currency} and ${transactions.type} = 'income' then ${transactions.amount}
        when ${transactions.currency} = ${currency} and ${transactions.type} = 'expense' then -${transactions.amount}
        when ${transactions.currency} = ${currency} and ${transactions.type} = 'refund' then ${transactions.amount}
        else 0
      end
    ), 0)`;
    const copEffect = effectFor('COP');
    const usdEffect = effectFor('USD');
    const effectFilter = (extra: SQL) => and(
      eq(transactions.status, 'posted'),
      inArray(transactions.type, ['income', 'expense', 'refund']),
      extra,
    );
    const [openingRows, previousRows, changeRows] = await Promise.all([
      database
        .select({
          cop: sql<number>`coalesce(sum(case when ${accounts.currency} = 'COP' then ${accounts.openingBalance} else 0 end), 0)`,
          usd: sql<number>`coalesce(sum(case when ${accounts.currency} = 'USD' then ${accounts.openingBalance} else 0 end), 0)`,
        })
        .from(accounts),
      database
        .select({ cop: copEffect, usd: usdEffect })
        .from(transactions)
        .where(effectFilter(lt(transactions.transactionDate, period.dateFrom))),
      database
        .select({ key, cop: copEffect, usd: usdEffect })
        .from(transactions)
        .where(effectFilter(and(
          gte(transactions.transactionDate, period.dateFrom),
          lte(transactions.transactionDate, period.dateTo),
        )!))
        .groupBy(key)
        .orderBy(asc(key)),
    ]);

    const toCop = (usdMinor: number): number =>
      valuationRate && usdMinor !== 0 ? convertUsdMinorToCopMinor(usdMinor, valuationRate) : 0;

    const openingCop = safeInteger(openingRows[0]?.cop ?? 0, 'Opening-balance total');
    const openingUsd = safeInteger(openingRows[0]?.usd ?? 0, 'Opening USD total');
    const prevCop = safeInteger(previousRows[0]?.cop ?? 0, 'Previous net-worth effect');
    const prevUsd = safeInteger(previousRows[0]?.usd ?? 0, 'Previous USD effect');
    const startingNetWorth = safeInteger(
      openingCop + toCop(openingUsd) + prevCop + toCop(prevUsd),
      'Starting net worth',
    );
    return {
      startingNetWorth,
      changes: changeRows.map((row) => ({
        key: row.key,
        amount: safeInteger(
          safeInteger(row.cop, 'Net-worth COP change') + toCop(safeInteger(row.usd, 'Net-worth USD change')),
          'Net-worth change',
        ),
      })),
    };
  }
}
