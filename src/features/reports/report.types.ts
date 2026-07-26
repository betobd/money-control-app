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

export type CategoryExpenseSummary = {
  categoryId: string;
  categoryName: string;
  icon: string;
  total: number;
  percentageBasisPoints: number;
  transactionCount: number;
};

export type NetWorthPoint = {
  key: string;
  label: string;
  date: string;
  netWorth: number;
  isStartingPoint: boolean;
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
  categoryExpenses: CategoryExpenseSummary[];
  netWorth: NetWorthPoint[];
  comparison: PreviousPeriodComparison;
  investments: ReportInvestments;
};

export type ReportSummaryAggregate = Omit<
  PeriodSummary,
  'expenses' | 'net' | 'averageExpense'
>;

export type ReportBucketAggregate = {
  key: string;
  income: number;
  grossExpenses: number;
  refunds: number;
};

export type CategoryExpenseAggregate = Omit<CategoryExpenseSummary, 'percentageBasisPoints'>;

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
