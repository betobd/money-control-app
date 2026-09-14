export const budgets = {
  createBudget: 'Create budget',
  selectedMonth: (month: string) => `Selected month, ${month}`,
  monthlyBudgets: 'Monthly budgets',
  monthlyCategoryBudgets: 'Monthly category budgets',

  status: {
    'on-track': 'On track',
    'near-limit': 'Near limit',
    'fully-used': 'Fully used',
    'over-budget': 'Over budget',
  },

  // Budget card
  spent: 'Spent',
  remaining: 'Remaining',
  overBy: 'Over by',
  spentOfLimit: (spent: string, limit: string) => `${spent} of ${limit}`,
  percentUsed: (percentage: number) => `${percentage}% used`,
  subLimit: 'Sub-limit',
  monthlyTag: 'Monthly',
  inParent: (parent: string) => `in ${parent}`,
  archivedCategory: 'Archived category',
  cardHint: 'Opens budget editing',
  cardAccessibility: (value: {
    category: string;
    archived: boolean;
    status: string;
    spent: string;
    limit: string;
    over: boolean;
    remaining: string;
    percentage: number;
  }) =>
    `${value.category}${value.archived ? ', archived category' : ''}, ${value.status}, spent ${value.spent} of ${value.limit}, ${value.over ? 'over by' : 'remaining'} ${value.remaining}, ${value.percentage}% used`,
  progressAccessibility: (status: string, percentage: number) => `${status}, ${percentage}% used`,

  // Summary card
  totalMonthlyBudget: 'Total monthly budget',
  summaryAccessibility: (total: string, spent: string, remaining: string, percentage: number) =>
    `Total monthly budget ${total}, spent ${spent}, remaining ${remaining}, ${percentage}% used`,
  overallProgress: 'Overall progress',
  nestedNote: (count: number) =>
    count === 1
      ? '1 sub-limit is counted inside its category, not added to the total.'
      : `${count} sub-limits are counted inside their categories, not added to the total.`,

  // States
  emptyTitle: 'No budgets for this month',
  emptyBody: 'Create a category budget to start planning your monthly spending.',
  createFirstBudget: 'Create the first budget',
  loadingBudgets: 'Loading budgets',
  retryLoading: 'Retry loading budgets',
  loadBudgetsError: 'Unable to load budgets.',

  // Category selector
  expenseCategory: 'Expense category',
  searchExpenseCategories: 'Search expense categories',
  searchCategories: 'Search categories',
  categoryOption: (name: string, archived: boolean) => `${name}${archived ? ', archived' : ''}`,
  archived: 'Archived',
  noMatchingCategories: 'No matching active expense categories.',

  // Color picker
  budgetColor: 'Budget color',
  colors: {
    blue: 'Blue',
    teal: 'Teal',
    green: 'Green',
    amber: 'Amber',
    coral: 'Coral',
    pink: 'Pink',
    purple: 'Purple',
    indigo: 'Indigo',
  },

  // Budget form
  closeForm: 'Close budget form',
  editTitle: 'Edit Budget',
  createTitle: 'Create Budget',
  category: 'Category',
  budgetMonth: 'Budget month',
  budgetMonthInput: 'Budget month in YYYY-MM format',
  monthPlaceholder: 'YYYY-MM',
  budgetLimit: 'Budget limit',
  repeatTitle: 'Repeat every month',
  repeatHint: 'Reappears automatically each month. Editing the amount applies from this month onward.',
  repeatAccessibility: 'Repeat this budget every month',
  removeBudget: 'Remove budget',
  removeTitle: 'Remove budget?',
  removeRecurringMessage:
    'This stops the recurring budget and removes this month and future months. Past months stay. Categories and transactions are not deleted.',
  removeOneOffMessage: 'This removes only this monthly plan. Categories and transactions are not deleted.',
  saveBudgetChanges: 'Save budget changes',
  saveChanges: 'Save changes',
  loadError: 'Unable to load budget.',
  saveError: 'Unable to save budget.',
  removeError: 'Unable to remove budget.',
  notFound: 'Budget not found.',

  // Validation
  errorSelectExpenseCategory: 'Select an expense category.',
  errorSelectExistingCategory: 'Select an existing expense category.',
  errorSelectActiveCategory: 'Select an active expense category.',
  errorInvalidMonth: 'Enter a valid month in YYYY-MM format.',
  errorLimitRange: 'Enter a positive limit within the supported range.',
  errorInvalidColor: 'Select a valid budget color.',
  errorRecurringExists: 'This category already has a recurring budget.',
  errorDuplicate: 'This category already has a budget for the selected month.',
  errorCeilingLimit: 'Enter a positive whole limit.',

  // Monthly ceiling card
  monthlyCeiling: 'Monthly ceiling',
  ceilingAccessibility: (limit: string, spent: string, over: boolean, remaining: string, percentage: number) =>
    `Monthly ceiling ${limit}, spent ${spent}, ${over ? 'over by' : 'remaining'} ${remaining}, ${percentage}% used`,
  carriedForward: (month: string) => `Carried forward from ${month}.`,
  spentThisMonth: 'Spent this month',
  allSpending: 'All spending',
  ceilingOverAllocated: (total: string, excess: string) =>
    `Category budgets add up to ${total}, which is ${excess} above this ceiling.`,
  ceilingUnallocated: (total: string, unallocated: string) =>
    `${total} is planned in category budgets; ${unallocated} of this ceiling is unbudgeted.`,
  ceilingEmptyBody:
    'Set one overall limit for the month. Every expense counts against it, including the ones no category budget covers.',
  setMonthlyCeiling: 'Set monthly ceiling',

  // Monthly ceiling form
  closeCeilingForm: 'Close monthly ceiling form',
  ceilingFor: (month: string) => `Ceiling for ${month}`,
  ceilingHelpCounts:
    'Every posted expense counts against this, minus refunds — including spending no category budget covers. Transfers and investment contributions do not count.',
  ceilingHelpApplies: (month: string) =>
    `It applies from ${month} onward until you change it. A later month you set explicitly keeps its own ceiling.`,
  removeCeiling: 'Remove ceiling',
  saveCeiling: 'Save ceiling',
  setCeiling: 'Set ceiling',
  remove: 'Remove',
  removeCeilingTitle: 'Remove the monthly ceiling?',
  removeCeilingMessage: (month: string) =>
    `No ceiling will apply from ${month} onward. Earlier months keep theirs, and no category budget is affected.`,
  ceilingEnterPositive: 'Enter a positive amount.',
  ceilingLoadError: 'Unable to load the monthly ceiling.',
  ceilingSaveError: 'Unable to save the monthly ceiling.',
  ceilingRemoveError: 'Unable to remove the monthly ceiling.',
};
