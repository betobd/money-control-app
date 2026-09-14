export const home = {
  loadError: 'Unable to load your dashboard right now.',
  loadingDashboard: 'Loading your dashboard',

  // Month selector
  selectedMonth: (month: string) => `Selected month, ${month}`,
  previousMonthHint: "Shows the previous month's summary and budgets",
  nextMonthHint: "Shows the next month's summary and budgets",

  // Balance hero
  totalBalance: 'Total balance',
  estimatedNetWorth: 'Estimated net worth',
  netWorthIncompleteLabel: (currencies: string) =>
    `Estimated net worth is incomplete because no exchange rate is available for ${currencies}`,
  estimatedIncomplete: 'Estimated — incomplete',
  netInMonth: (month: string) => `net in ${month}`,

  // Summary strip
  income: 'Income',
  refunds: 'Refunds',
  netExpenses: 'Net expenses',
  netResult: 'Net result',

  // Investments card
  investments: 'Investments',
  investmentsHint: 'Open the investments screen',
  investmentsLabel: (value: string) => `Investments, current value ${value}`,
  investmentsIncompleteValue: 'estimated, incomplete',
  viewInvestments: 'View investments',
  gainLossUnavailable: 'Estimated gain/loss unavailable',
  gainLoss: (amount: string) => `${amount} estimated gain/loss`,
  asOf: (date: string) => `as of ${date}`,

  // Budget card
  monthlyCeiling: 'Monthly ceiling',
  monthlyBudget: 'Monthly budget',
  budgetCardLabel: (title: string, spent: string, total: string, percentage: number, over: boolean) =>
    `${title}, ${spent} spent of ${total}, ${percentage}% used${over ? ', over budget' : ''}`,
  noBudgets: 'No budgets set for this month',
  percentUsed: (percentage: number) => `${percentage}% used`,
  overBudget: 'Over budget',
  spent: (amount: string) => `${amount} spent`,
  ofTotal: (amount: string) => `of ${amount}`,
  ceilingNote: 'All spending this month, including what no category budget covers.',
  byCategory: 'By category',
  viewAll: 'View all',
  viewAllBudgets: 'View all budgets',
  categoryRowLabel: (category: string, percentage: number, over: boolean) =>
    `${category}, ${percentage}% used${over ? ', over budget' : ''}`,

  // Recent transactions
  recentTransactions: 'Recent transactions',
  viewAllTransactions: 'View all transactions',
  noRecentTransactions: 'No recent transactions.',
};
