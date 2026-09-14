export const reports = {
  title: 'Reports',
  headerSubtitle: 'Persisted financial history',
  backFromReports: 'Back from Reports',
  loadingReports: 'Loading reports',
  loadErrorTitle: 'Unable to load reports',
  loadError: 'Unable to load reports.',
  budgetsLoadError: 'Unable to load budgets for this period.',
  updating: 'Updating all report sections…',

  // Period selector
  presetCurrentMonth: 'Current month',
  presetPreviousMonth: 'Previous month',
  presetLast3Months: 'Last 3 months',
  presetLast6Months: 'Last 6 months',
  presetCurrentYear: 'Current year',
  presetCustom: 'Custom',
  startDate: 'Start date',
  endDate: 'End date',
  applyRange: 'Apply range',
  applyRangeLabel: 'Apply custom report period',
  invalidPeriod: 'Invalid report period.',
  selectedPeriod: (label: string) => `Selected report period, ${label}`,

  // Period validation
  invalidToday: 'Unable to determine a valid Bogotá-local date.',
  invalidCustomDates: 'Enter valid start and end dates in YYYY-MM-DD format.',
  endBeforeStart: 'End date cannot be earlier than start date.',

  // Data labels built by the service and repository
  netWorthStart: 'Start',
  unknownCategory: 'Unknown category',
  noSubcategory: 'No subcategory',

  // Empty notice
  emptyTitle: 'No posted income or expenses',
  emptyDescription:
    'Totals remain zero for this period. Transfers, voided transactions, and pending or skipped recurring occurrences do not count.',

  // Period summary
  summaryTitle: 'Period summary',
  summaryDescription: 'Posted income and expenses in the selected period.',
  netResult: 'Net result',
  income: 'Income',
  expenses: 'Expenses',
  net: 'Net',
  netExpenses: 'Net expenses',
  grossExpenses: 'Gross expenses',
  refunds: 'Refunds',
  averageExpense: 'Average expense',
  expenseTransactions: 'Expense transactions',
  incomeTransactions: 'Income transactions',
  refundTransactions: 'Refund transactions',
  largestExpense: 'Largest expense',
  noLargestExpense: 'No posted expenses in this period.',
  savingsRateNotApplicable: 'No income this period, so a savings rate does not apply.',
  savingsRate: (percentage: string) => `You kept ${percentage} of what you earned.`,
  showDetails: 'Show details',
  hideDetails: 'Hide details',
  showSummaryDetails: 'Show summary details',
  hideSummaryDetails: 'Hide summary details',

  // Cash flow
  cashFlowTitle: 'Income vs expenses',
  cashFlowDescriptionDay:
    'One column per Bogotá-local day. Income rises above the line, expenses fall below it.',
  cashFlowDescriptionMonth:
    'One column per calendar month. Income rises above the line, expenses fall below it.',
  wholePeriod: 'Whole period',
  cashFlowChartLabel: (income: string, expenses: string) =>
    `Cash flow chart. Total income ${income}. Total expenses ${expenses}.`,
  cashFlowHint: 'Tap a column for that day’s detail.',
  cashFlowHintSelected: 'Tap the column again to see the whole period.',

  // Spending pace
  paceTitle: 'Spending pace',
  paceDescription: (previousPeriod: string) =>
    `Running total of net expenses, against the same point of ${previousPeriod}.`,
  previousPeriod: 'Previous period',
  thisPeriod: 'This period',
  spentSoFar: 'Spent so far',
  versusLast: (signedAmount: string) => `${signedAmount} vs last`,
  paceChartLabel: (spent: string, previousAmount: string, previousPeriod: string) =>
    `Cumulative spending. ${spent} so far, against ${previousAmount} at the same point of ${previousPeriod}.`,

  // Budget vs actual
  budgetTitle: 'Budget vs actual',
  budgetDescription:
    'Category budgets against what was actually spent. Spending is already net of refunds and excludes transfers.',
  budgetSumHint: (monthCount: number) =>
    `Limits are the sum of ${monthCount} monthly budgets; budgets are never prorated.`,
  budgetRowLabel: (category: string, spent: string, limit: string, percentage: number) =>
    `${category}, ${spent} spent of ${limit}, ${percentage}% used`,
  spentOfLimit: (spent: string, limit: string) => `${spent} of ${limit}`,
  remaining: (amount: string) => `${amount} remaining`,
  over: (amount: string) => `${amount} over`,

  // Weekday spending
  weekdayTitle: 'Spending by weekday',
  weekdayDescription:
    'Average net expenses per weekday, divided by how many of each weekday the period contained.',
  /**
   * `shortDay` is the column label (`Mon`), `longDay` the full name (`Monday`),
   * `weekday` 0 = Sunday — for languages whose article or gender depends on the day.
   */
  weekdayColumnLabel: (shortDay: string, longDay: string, average: string, dayCount: number) =>
    `${shortDay}, average ${average} across ${dayCount} days`,
  heaviestDay: (shortDay: string, longDay: string, weekday: number, amount: string) =>
    `${shortDay} is your heaviest day — ${amount} on average.`,
  noWeekdayExpenses: 'No expenses to compare across weekdays.',

  // Categories
  categoryTitle: 'Expenses by category',
  categoryDescription:
    'All posted expenses ranked by stable category ID, including archived historical categories.',
  categoryEmpty: 'No posted expenses to rank for this period.',
  donutLabel: (total: string) => `Expenses by category. Total ${total}.`,
  totalExpenses: 'Total expenses',
  otherCategories: (count: number) => `Other (${count})`,
  expensesRanked: 'Expenses ranked by category',
  transactionCount: (count: number) => `${count} ${count === 1 ? 'transaction' : 'transactions'}`,
  inDetail: (count: number) => `${count} in detail`,
  shareOfCategory: (percentage: string, category: string) => `${percentage} of ${category}`,
  showBreakdownHint: 'Shows the subcategory breakdown',
  hideBreakdownHint: 'Hides the subcategory breakdown',

  // Net worth
  netWorthTitle: 'Net worth evolution',
  netWorthDescriptionDay: (date: string) =>
    `Starts with net worth before ${date}, then applies posted history through each day.`,
  netWorthDescriptionMonth: (date: string) =>
    `Starts with net worth before ${date}, then applies posted history through each month end.`,
  noNetWorthHistory: 'No net-worth history for this period.',
  endingNetWorth: 'Ending net worth',
  netWorthChartLabel: (start: string, end: string) =>
    `Net worth evolution. Starts at ${start}, ends at ${end}.`,

  // Investments
  investmentsTitle: 'Investments',
  investmentsDescription:
    'Current investment position (estimated) plus realized investment income for the period. Unrealized valuation changes raise net worth but are never counted as ordinary income.',
  currentValue: 'Current value',
  estimatedIncomplete: 'Estimated — incomplete',
  netContributions: 'Net contributions',
  estimatedGainLoss: 'Estimated gain/loss',
  simpleEstimatedReturn: 'Simple estimated return',
  investmentIncomePeriod: 'Investment income (period)',

  // Previous period comparison
  comparisonTitle: 'Previous period comparison',
  comparisonDescription: (previousPeriod: string) =>
    `Compared with ${previousPeriod}. Expense increases use a negative semantic indicator.`,
  noChange: 'No change',
  noPreviousData: 'No previous-period data',
  percentageUnavailable: 'percentage unavailable',
  increasedBy: (difference: string, percentage: string) => `Increased by ${difference} (${percentage})`,
  decreasedBy: (difference: string, percentage: string) => `Decreased by ${difference} (${percentage})`,
  comparisonRowLabel: (label: string, current: string, change: string) =>
    `${label}. Current ${current}. ${change}.`,
};
