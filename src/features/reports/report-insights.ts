import { calculateBasisPoints, safeInteger } from './report-math';
import type {
  BudgetPerformance,
  BudgetLimitForPeriod,
  CashFlowBucket,
  CategoryExpenseAggregate,
  CategoryExpenseSummary,
  SubcategoryExpenseSummary,
  PacePoint,
  WeekdaySpending,
} from './report.types';

/** Label for spending recorded on a category with no subcategory chosen. */
export const NO_SUBCATEGORY_LABEL = 'No subcategory';

/** Short weekday names, Sunday first (matches CLDR's first day for es-CO). */
const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * Share of income kept after net expenses, in basis points.
 *
 * Returns null when there is no income: a rate against a zero denominator is
 * undefined, and reporting 0% would read as "saved nothing" rather than
 * "not applicable".
 */
export function savingsRateBasisPoints(income: number, net: number): number | null {
  if (income <= 0) return null;
  return calculateBasisPoints(net, income);
}

/**
 * Net expenses grouped by day of week.
 *
 * Only meaningful for day-grouped periods; a month-grouped period has no daily
 * resolution, so callers pass an empty array and the section is hidden.
 * `average` divides by how many times that weekday actually occurred in the
 * period, so a period containing five Fridays and four Mondays stays comparable.
 */
export function weekdaySpending(buckets: CashFlowBucket[]): WeekdaySpending[] {
  const totals = weekdayNames.map((label, weekday) => ({
    weekday,
    label,
    total: 0,
    average: 0,
    dayCount: 0,
  }));

  for (const bucket of buckets) {
    const weekday = weekdayOf(bucket.dateFrom);
    if (weekday === null) continue;
    const entry = totals[weekday];
    entry.total += bucket.expenses;
    entry.dayCount += 1;
  }

  for (const entry of totals) {
    entry.average = entry.dayCount === 0 ? 0 : Math.round(entry.total / entry.dayCount);
  }
  return totals;
}

/**
 * Cumulative net expenses through the period, aligned index-by-index against the
 * previous equivalent period.
 *
 * Alignment is positional, not by date, because the periods can have different
 * lengths (a 31-day month against a 30-day one). The shorter series simply ends
 * early rather than being stretched, which would invent data points.
 */
export function cumulativePace(
  current: CashFlowBucket[],
  previous: CashFlowBucket[],
): PacePoint[] {
  const runningCurrent = runningTotals(current);
  const runningPrevious = runningTotals(previous);
  return current.map((bucket, index) => ({
    key: bucket.key,
    label: bucket.label,
    index,
    current: runningCurrent[index],
    previous: index < runningPrevious.length ? runningPrevious[index] : null,
  }));
}

/**
 * Budget limits for the period against what was actually spent per category.
 *
 * Spending comes from the period's category totals, so it already excludes
 * transfers, voided transactions and unconfirmed recurring occurrences, and is
 * already net of refunds. Categories with a limit but no spending are kept (the
 * useful "nothing spent yet" case); spending without a limit is not a budget and
 * is left to the category ranking.
 */
export function budgetPerformance(
  limits: BudgetLimitForPeriod[],
  categoryExpenses: CategoryExpenseSummary[],
): BudgetPerformance[] {
  const spentByCategory = new Map(categoryExpenses.map((entry) => [entry.categoryId, entry]));
  return limits
    .filter((limit) => limit.limitAmount > 0)
    .map((limit) => {
      const actual = spentByCategory.get(limit.categoryId);
      const spent = actual?.total ?? 0;
      const percentageUsed = limit.limitAmount === 0
        ? 0
        : Math.round(calculateBasisPoints(spent, limit.limitAmount) / 100);
      return {
        categoryId: limit.categoryId,
        categoryName: limit.categoryName,
        icon: actual?.icon ?? limit.icon,
        limit: limit.limitAmount,
        spent,
        remaining: limit.limitAmount - spent,
        percentageUsed,
        status: spent > limit.limitAmount ? 'over' : percentageUsed >= 80 ? 'near' : 'under',
      } satisfies BudgetPerformance;
    })
    .sort((a, b) => b.percentageUsed - a.percentageUsed || a.categoryName.localeCompare(b.categoryName));
}

/** Every `YYYY-MM` the inclusive range touches, in order. */
export function monthsBetween(dateFrom: string, dateTo: string): string[] {
  const months: string[] = [];
  let [year, month] = dateFrom.split('-').map(Number);
  const last = dateTo.slice(0, 7);
  for (let guard = 0; guard < 240; guard += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    months.push(key);
    if (key >= last) break;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

function runningTotals(buckets: CashFlowBucket[]): number[] {
  let total = 0;
  return buckets.map((bucket) => {
    total += bucket.expenses;
    return total;
  });
}

function weekdayOf(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay();
}

/**
 * Folds leaf (category, subcategory) rows into the ranked category list.
 *
 * The category ranking is identical to what it was before subcategories existed:
 * a category's total is the sum of its own spending and all of its
 * subcategories'. The breakdown is attached rather than replacing anything, so
 * every existing consumer keeps reading the same numbers.
 */
export function foldCategoryExpenses(
  rows: readonly CategoryExpenseAggregate[],
): CategoryExpenseSummary[] {
  const byCategory = new Map<string, CategoryExpenseSummary>();

  for (const row of rows) {
    let category = byCategory.get(row.categoryId);
    if (!category) {
      category = {
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        icon: row.icon,
        total: 0,
        percentageBasisPoints: 0,
        transactionCount: 0,
        subcategories: [],
      };
      byCategory.set(row.categoryId, category);
    }
    category.total = safeInteger(category.total + row.total, 'Category spending');
    category.transactionCount += row.transactionCount;
    category.subcategories.push({
      subcategoryId: row.subcategoryId,
      name: row.subcategoryName ?? NO_SUBCATEGORY_LABEL,
      total: row.total,
      percentageBasisPoints: 0,
      transactionCount: row.transactionCount,
    });
  }

  const categories = [...byCategory.values()];
  const totalExpenses = categories.reduce(
    (sum, category) => safeInteger(sum + category.total, 'Total category spending'),
    0,
  );

  return categories
    .map((category) => ({
      ...category,
      percentageBasisPoints: calculateBasisPoints(category.total, totalExpenses),
      // A lone "No subcategory" row is not a breakdown — it repeats the header.
      // A lone named row is: it says all of this category went to one thing.
      subcategories: category.subcategories.length === 1 && category.subcategories[0].subcategoryId === null
        ? []
        : category.subcategories
            .map((subcategory) => ({
              ...subcategory,
              percentageBasisPoints: calculateBasisPoints(subcategory.total, category.total),
            }))
            .sort(compareSubcategories),
    }))
    .sort((a, b) => b.total - a.total || a.categoryId.localeCompare(b.categoryId));
}

function compareSubcategories(a: SubcategoryExpenseSummary, b: SubcategoryExpenseSummary): number {
  if (a.total !== b.total) return b.total - a.total;
  // On a tie, named rows come before the unclassified bucket.
  if ((a.subcategoryId === null) !== (b.subcategoryId === null)) return a.subcategoryId === null ? 1 : -1;
  return a.name.localeCompare(b.name);
}
