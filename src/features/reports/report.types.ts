export const reportPeriodPresets = [
  'current-month',
  'previous-month',
  'last-3-months',
  'last-6-months',
  'current-year',
  'custom',
] as const;

export type ReportPeriodPreset = (typeof reportPeriodPresets)[number];
export type ReportGrouping = 'day' | 'month';

export type ReportPeriod = {
  preset: ReportPeriodPreset;
  dateFrom: string;
  dateTo: string;
  grouping: ReportGrouping;
  label: string;
};

export type ReportPeriodSelection = {
  preset: ReportPeriodPreset;
  customDateFrom?: string;
  customDateTo?: string;
};

export type LargestExpense = {
  amount: number;
  categoryName: string;
  accountName: string;
  transactionDate: string;
};

export type PeriodSummary = {
  income: number;
  grossExpenses: number;
  refunds: number;
  expenses: number;
  net: number;
  expenseCount: number;
  refundCount: number;
  incomeCount: number;
  averageExpense: number;
  largestExpense: LargestExpense | null;
  /**
   * Net result as a share of income, in basis points. Null when there is no
   * income in the period, where a rate is undefined rather than zero.
   */
  savingsRateBasisPoints: number | null;
};

export type CashFlowBucket = {
  key: string;
  label: string;
  dateFrom: string;
  dateTo: string;
  income: number;
  grossExpenses: number;
  refunds: number;
  expenses: number;
  net: number;
};

/** One row of a category's internal breakdown. */
export type SubcategoryExpenseSummary = {
  /** Null for spending recorded on the category itself, with no subcategory. */
  subcategoryId: string | null;
  name: string;
  total: number;
  /** Share of the parent category's total, in basis points. */
  percentageBasisPoints: number;
  transactionCount: number;
};

export type CategoryExpenseSummary = {
  categoryId: string;
  categoryName: string;
  icon: string;
  /** Includes every subcategory, so this ranking is unchanged by subcategories. */
  total: number;
  /** Share of all expenses in the period, in basis points. */
  percentageBasisPoints: number;
  transactionCount: number;
  /**
   * Breakdown rows, summing exactly to `total`. Empty when the category has no
   * subcategorised spending at all, where a one-row breakdown says nothing.
   */
  subcategories: SubcategoryExpenseSummary[];
};

export type NetWorthPoint = {
  key: string;
  label: string;
  date: string;
  netWorth: number;
  isStartingPoint: boolean;
};

/** Net expenses for one day of week across the period. */
export type WeekdaySpending = {
  /** 0 = Sunday. */
  weekday: number;
  label: string;
  total: number;
  /** Total divided by how many of that weekday the period actually contained. */
  average: number;
  dayCount: number;
};

/** One step of the cumulative-spending comparison against the previous period. */
export type PacePoint = {
  key: string;
  label: string;
  index: number;
  current: number | null;
  /** Previous period's cumulative total at the same offset, null past its end. */
  previous: number | null;
};

/** A category budget limit that applies to the report period. */
export type BudgetLimitForPeriod = {
  categoryId: string;
  categoryName: string;
  icon: string;
  /** Sum of the monthly limits for every month the period covers. */
  limitAmount: number;
  monthCount: number;
};

export type BudgetPerformance = {
  categoryId: string;
  categoryName: string;
  icon: string;
  limit: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  status: 'under' | 'near' | 'over';
};

export type ComparisonDirection = 'increased' | 'decreased' | 'unchanged';
export type ComparisonTone = 'positive' | 'negative' | 'neutral';

export type ComparisonMetric = {
  current: number;
  previous: number;
  difference: number;
  percentageChangeBasisPoints: number | null;
  direction: ComparisonDirection;
  tone: ComparisonTone;
  hasPreviousData: boolean;
};

export type PreviousPeriodComparison = {
  currentPeriod: ReportPeriod;
  previousPeriod: ReportPeriod;
  income: ComparisonMetric;
  expenses: ComparisonMetric;
  net: ComparisonMetric;
  averageExpense: ComparisonMetric;
  expenseCount: ComparisonMetric;
};

/** Realized investment income posted within the report period (COP base snapshot). */
export type ReportInvestments = {
  incomeCopMinor: number;
  incomeCount: number;
};

export type ReportData = {
  period: ReportPeriod;
  summary: PeriodSummary;
  cashFlow: CashFlowBucket[];
  /** Empty for month-grouped periods, which have no daily resolution. */
  weekdaySpending: WeekdaySpending[];
  pace: PacePoint[];
  categoryExpenses: CategoryExpenseSummary[];
  netWorth: NetWorthPoint[];
  comparison: PreviousPeriodComparison;
  investments: ReportInvestments;
};

export type ReportSummaryAggregate = Omit<
  PeriodSummary,
  'expenses' | 'net' | 'averageExpense' | 'savingsRateBasisPoints'
>;

export type ReportBucketAggregate = {
  key: string;
  income: number;
  grossExpenses: number;
  refunds: number;
};

/**
  * One (category, subcategory) group as the database returns it.
  *
  * Grouping at the leaf level and folding upwards in one pass is deliberate: a
  * separate breakdown query could drift from the ranking query and a category's
  * total would stop equalling the sum of its parts.
  */
export type CategoryExpenseAggregate = {
  categoryId: string;
  categoryName: string;
  icon: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  total: number;
  transactionCount: number;
};

export type NetWorthAggregate = {
  startingNetWorth: number;
  changes: { key: string; amount: number }[];
};

/**
 * One valuation's unrealized adjustment (value − basis) in the account's native
 * currency, used to overlay investment valuations onto the net-worth timeline.
 */
export type InvestmentValuationSeriesRow = {
  accountId: string;
  currency: 'COP' | 'USD';
  valuationDate: string;
  unrealizedNativeMinor: number;
};
