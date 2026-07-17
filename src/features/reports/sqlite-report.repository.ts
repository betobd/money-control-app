import { and, asc, desc, eq, gte, inArray, lt, lte, sql, type SQL } from 'drizzle-orm';

import { database } from '@/database/client';
import { accounts, categories, transactions } from '@/database/schema';
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

function safeMoneySum(left: number, right: number, label: string): number {
  return safeInteger(left + right, label);
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
          income: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
          expenses: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
          incomeCount: sql<number>`sum(case when ${transactions.type} = 'income' then 1 else 0 end)`,
          expenseCount: sql<number>`sum(case when ${transactions.type} = 'expense' then 1 else 0 end)`,
        })
        .from(transactions)
        .where(condition),
      database
        .select({
          amount: transactions.amount,
          categoryName: categories.name,
          accountName: accounts.name,
          transactionDate: transactions.transactionDate,
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(condition, eq(transactions.type, 'expense')))
        .orderBy(desc(transactions.amount), desc(transactions.transactionDate), desc(transactions.id))
        .limit(1),
    ]);

    const aggregate = aggregateRows[0];
    const largest = largestRows[0];
    return {
      income: safeInteger(aggregate?.income ?? 0, 'Report income'),
      expenses: safeInteger(aggregate?.expenses ?? 0, 'Report expenses'),
      incomeCount: safeInteger(aggregate?.incomeCount ?? 0, 'Report income count'),
      expenseCount: safeInteger(aggregate?.expenseCount ?? 0, 'Report expense count'),
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
        income: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
        expenses: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
      })
      .from(transactions)
      .where(and(
        eq(transactions.status, 'posted'),
        inArray(transactions.type, ['income', 'expense']),
        gte(transactions.transactionDate, period.dateFrom),
        lte(transactions.transactionDate, period.dateTo),
      ))
      .groupBy(key)
      .orderBy(asc(key));

    return rows.map((row) => ({
      key: row.key,
      income: safeInteger(row.income, 'Cash-flow income'),
      expenses: safeInteger(row.expenses, 'Cash-flow expenses'),
    }));
  }

  async categoryExpenses(period: ReportPeriod): Promise<CategoryExpenseAggregate[]> {
    const total = sql<number>`coalesce(sum(${transactions.amount}), 0)`;
    const rows = await database
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        icon: categories.icon,
        total,
        transactionCount: sql<number>`count(*)`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.status, 'posted'),
        eq(transactions.type, 'expense'),
        gte(transactions.transactionDate, period.dateFrom),
        lte(transactions.transactionDate, period.dateTo),
      ))
      .groupBy(transactions.categoryId, categories.id, categories.name, categories.icon)
      .orderBy(desc(total), asc(transactions.categoryId));

    return rows.map((row) => ({
      categoryId: row.categoryId ?? UNKNOWN_CATEGORY_ID,
      categoryName: row.categoryName ?? UNKNOWN_CATEGORY_NAME,
      icon: row.icon ?? UNKNOWN_CATEGORY_ICON,
      total: safeInteger(row.total, 'Category spending'),
      transactionCount: safeInteger(row.transactionCount, 'Category transaction count'),
    }));
  }

  async netWorth(period: ReportPeriod, grouping: ReportGrouping): Promise<NetWorthAggregate> {
    const key = groupingExpression(grouping);
    const effect = sql<number>`coalesce(sum(
      case
        when ${transactions.type} = 'income' then ${transactions.amount}
        when ${transactions.type} = 'expense' then -${transactions.amount}
        else 0
      end
    ), 0)`;
    const [openingRows, previousRows, changeRows] = await Promise.all([
      database
        .select({ total: sql<number>`coalesce(sum(${accounts.openingBalance}), 0)` })
        .from(accounts),
      database
        .select({ total: effect })
        .from(transactions)
        .where(and(
          eq(transactions.status, 'posted'),
          inArray(transactions.type, ['income', 'expense']),
          lt(transactions.transactionDate, period.dateFrom),
        )),
      database
        .select({ key, amount: effect })
        .from(transactions)
        .where(and(
          eq(transactions.status, 'posted'),
          inArray(transactions.type, ['income', 'expense']),
          gte(transactions.transactionDate, period.dateFrom),
          lte(transactions.transactionDate, period.dateTo),
        ))
        .groupBy(key)
        .orderBy(asc(key)),
    ]);

    const openingBalance = safeInteger(openingRows[0]?.total ?? 0, 'Opening-balance total');
    const previousEffect = safeInteger(previousRows[0]?.total ?? 0, 'Previous net-worth effect');
    return {
      startingNetWorth: safeMoneySum(openingBalance, previousEffect, 'Starting net worth'),
      changes: changeRows.map((row) => ({
        key: row.key,
        amount: safeInteger(row.amount, 'Net-worth change'),
      })),
    };
  }
}
