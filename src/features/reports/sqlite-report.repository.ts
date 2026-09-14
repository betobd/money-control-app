import { and, asc, desc, eq, gte, inArray, lt, lte, or, sql, type SQL } from 'drizzle-orm';

import { database } from '@/database/client';
import { accounts, categories, investmentValuations, transactions } from '@/database/schema';
import { alias } from 'drizzle-orm/sqlite-core';
import { isSupportedCurrency, type CurrencyCode } from '@/features/currency/currency';
import type { ValuationRates } from '@/features/exchange-rates/valuation-rates';
import { getMessages } from '@/i18n/messages';
import type { ReportRepository } from './report.repository';
import type {
  CategoryExpenseAggregate,
  InvestmentValuationSeriesRow,
  NetWorthAggregate,
  ReportBucketAggregate,
  ReportGrouping,
  ReportPeriod,
  ReportSummaryAggregate,
} from './report.types';

// The seeded "Investment Income" income category (fresh installs). Realized
// investment income is income into an investment account OR tagged this category.
const INVESTMENT_INCOME_CATEGORY_ID = 'default-income-investment';

const UNKNOWN_CATEGORY_ID = 'unknown-category';
const UNKNOWN_CATEGORY_ICON = 'other';
const originalTransactions = alias(transactions, 'report_original_transactions');
const originalCategories = alias(categories, 'report_original_categories');
const subcategories = alias(categories, 'report_subcategories');
const originalSubcategories = alias(categories, 'report_original_subcategories');

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
            categoryName: largest.categoryName ?? getMessages().reports.unknownCategory,
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

  /**
   * Expenses grouped by (category, subcategory).
   *
   * Both levels resolve refunds through the expense they refund, with the same
   * coalesce, so a refund lands in exactly the bucket its original expense did.
   * The caller folds these leaf rows into categories; because the ranking and
   * the breakdown come from one grouping, a category's total is the sum of its
   * rows by construction rather than by agreement between two queries.
   */
  async categoryExpenses(period: ReportPeriod): Promise<CategoryExpenseAggregate[]> {
    const effectiveCategoryId = sql<string>`coalesce(${transactions.categoryId}, ${originalTransactions.categoryId})`;
    const effectiveSubcategoryId = sql<string | null>`coalesce(${transactions.subcategoryId}, ${originalTransactions.subcategoryId})`;
    const total = sql<number>`coalesce(sum(case
      when ${transactions.type} = 'expense' then coalesce(${transactions.baseAmountMinor}, ${transactions.amount})
      when ${transactions.type} = 'refund' then -coalesce(${transactions.baseAmountMinor}, ${transactions.amount})
      else 0 end), 0)`;
    const rows = await database
      .select({
        categoryId: effectiveCategoryId,
        categoryName: sql<string | null>`coalesce(${categories.name}, ${originalCategories.name})`,
        icon: sql<string | null>`coalesce(${categories.icon}, ${originalCategories.icon})`,
        subcategoryId: effectiveSubcategoryId,
        subcategoryName: sql<string | null>`coalesce(${subcategories.name}, ${originalSubcategories.name})`,
        total,
        transactionCount: sql<number>`count(*)`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(subcategories, eq(transactions.subcategoryId, subcategories.id))
      .leftJoin(originalTransactions, eq(transactions.originalTransactionId, originalTransactions.id))
      .leftJoin(originalCategories, eq(originalTransactions.categoryId, originalCategories.id))
      .leftJoin(originalSubcategories, eq(originalTransactions.subcategoryId, originalSubcategories.id))
      .where(and(
        eq(transactions.status, 'posted'),
        inArray(transactions.type, ['expense', 'refund']),
        gte(transactions.transactionDate, period.dateFrom),
        lte(transactions.transactionDate, period.dateTo),
      ))
      .groupBy(effectiveCategoryId, effectiveSubcategoryId)
      .orderBy(desc(total), asc(effectiveCategoryId));

    return rows.map((row) => ({
      categoryId: row.categoryId ?? UNKNOWN_CATEGORY_ID,
      categoryName: row.categoryName ?? getMessages().reports.unknownCategory,
      icon: row.icon ?? UNKNOWN_CATEGORY_ICON,
      subcategoryId: row.subcategoryId ?? null,
      // A subcategory id with no name means the row was archived and hard-deleted,
      // which the schema forbids; fall back rather than render an empty label.
      subcategoryName: row.subcategoryId ? row.subcategoryName ?? getMessages().reports.noSubcategory : null,
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
    rates: ValuationRates,
  ): Promise<NetWorthAggregate> {
    const key = groupingExpression(grouping);
    // Grouped by currency rather than pivoted into one column per currency: with a
    // configurable base there is no fixed pair to pivot on, and the fold below
    // values whatever currencies actually turn up.
    const effect = sql<number>`coalesce(sum(
      case
        when ${transactions.type} = 'income' then ${transactions.amount}
        when ${transactions.type} = 'expense' then -${transactions.amount}
        when ${transactions.type} = 'refund' then ${transactions.amount}
        else 0
      end
    ), 0)`;
    const effectFilter = (extra: SQL) => and(
      eq(transactions.status, 'posted'),
      inArray(transactions.type, ['income', 'expense', 'refund']),
      extra,
    );
    const [openingRows, previousRows, changeRows] = await Promise.all([
      database
        .select({
          currency: accounts.currency,
          total: sql<number>`coalesce(sum(${accounts.openingBalance}), 0)`,
        })
        .from(accounts)
        .groupBy(accounts.currency),
      database
        .select({ currency: transactions.currency, total: effect })
        .from(transactions)
        .where(effectFilter(lt(transactions.transactionDate, period.dateFrom)))
        .groupBy(transactions.currency),
      database
        .select({ key, currency: transactions.currency, total: effect })
        .from(transactions)
        .where(effectFilter(and(
          gte(transactions.transactionDate, period.dateFrom),
          lte(transactions.transactionDate, period.dateTo),
        )!))
        .groupBy(key, transactions.currency)
        .orderBy(asc(key)),
    ]);

    // An amount in a currency with no saved rate contributes nothing, matching the
    // pre-existing behaviour of a missing USD/COP rate. The timeline is labelled
    // as an estimate; the report header carries the incompleteness.
    const valued = (rows: { currency: string; total: number }[], label: string): number => {
      let total = 0;
      for (const row of rows) {
        if (!isSupportedCurrency(row.currency)) continue;
        const amount = safeInteger(row.total, label);
        if (amount === 0) continue;
        total += rates.toBase(amount, row.currency) ?? 0;
      }
      return safeInteger(total, label);
    };

    const startingNetWorth = safeInteger(
      valued(openingRows, 'Opening-balance total') + valued(previousRows, 'Previous net-worth effect'),
      'Starting net worth',
    );

    const byKey = new Map<string, { currency: string; total: number }[]>();
    for (const row of changeRows) {
      const bucket = byKey.get(row.key);
      if (bucket) bucket.push(row);
      else byKey.set(row.key, [row]);
    }
    return {
      startingNetWorth,
      changes: [...byKey.entries()].map(([bucketKey, rows]) => ({
        key: bucketKey,
        amount: valued(rows, 'Net-worth change'),
      })),
    };
  }

  async investmentValuationSeries(): Promise<InvestmentValuationSeriesRow[]> {
    const rows = await database
      .select({
        accountId: investmentValuations.investmentAccountId,
        currency: investmentValuations.currencyCode,
        valuationDate: investmentValuations.valuationDate,
        unrealized: sql<number>`${investmentValuations.valueMinor} - ${investmentValuations.basisMinor}`,
      })
      .from(investmentValuations)
      .innerJoin(accounts, eq(investmentValuations.investmentAccountId, accounts.id))
      .where(eq(accounts.type, 'investment'))
      .orderBy(asc(investmentValuations.investmentAccountId), asc(investmentValuations.valuationDate));
    return rows.flatMap((row) => (isSupportedCurrency(row.currency) ? [{
      accountId: row.accountId,
      currency: row.currency as CurrencyCode,
      valuationDate: row.valuationDate,
      unrealizedNativeMinor: safeInteger(row.unrealized, 'Investment unrealized adjustment'),
    }] : []));
  }

  async investmentIncome(period: ReportPeriod): Promise<{ baseMinor: number; count: number }> {
    const [row] = await database
      .select({
        total: sql<number>`coalesce(sum(coalesce(${transactions.baseAmountMinor}, ${transactions.amount})), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(
        eq(transactions.status, 'posted'),
        eq(transactions.type, 'income'),
        gte(transactions.transactionDate, period.dateFrom),
        lte(transactions.transactionDate, period.dateTo),
        or(eq(accounts.type, 'investment'), eq(transactions.categoryId, INVESTMENT_INCOME_CATEGORY_ID)),
      ));
    return {
      baseMinor: safeInteger(row?.total ?? 0, 'Investment income'),
      count: safeInteger(row?.count ?? 0, 'Investment income count'),
    };
  }
}
