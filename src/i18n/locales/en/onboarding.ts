export const onboarding = {
  tagline: 'Your money, clear and private.',
  highlights: {
    privateTitle: 'Private by design',
    privateBody: 'No sign-up. Your data stays on this phone unless you export it.',
    currencyTitle: 'Any currency',
    currencyBody: 'Keep accounts in the currencies you use and see every total in yours.',
    budgetsTitle: 'Budgets that keep you on track',
    budgetsBody: 'Set a monthly ceiling and category limits, and see where your money goes.',
  },
  getStarted: 'Get started',
  restore: 'Restore from a backup',
  languageButton: (languageName: string) => `Language: ${languageName}`,
  languageSheetTitle: 'Language',
  currencyTitle: 'Main currency',
  backToWelcome: 'Back to welcome',
  currencyQuestion: 'Which currency do you use day to day?',
  currencyBody: 'Totals, budgets and reports are shown in this currency. You can still keep accounts in other currencies.',
  currencyCardLabel: (code: string, name: string) => `Main currency: ${code}, ${name}`,
  currencyCardHint: 'Opens the list of currencies',
  change: 'Change',
  lockNote: 'You can change it until you record your first transaction or budget. After that it stays fixed, because every amount is saved in it.',
  saveFailed: 'Your currency could not be saved. Try again.',
  start: (code: string) => `Use ${code} and start`,
  suggested: 'Suggested',
  /** Base-currency settings errors, shown wherever the base currency is changed. */
  baseCurrency: {
    unsupported: 'Select a supported currency.',
    missing: 'Application settings are missing from the database.',
    lockedByHistory: (count: number) =>
      `Every one of your ${count} ${count === 1 ? 'transaction' : 'transactions'} stores its value in the current base currency. Changing it would require restating them at historical exchange rates, which are not kept.`,
    lockedByBudgets: (count: number) =>
      `Your ${count} ${count === 1 ? 'budget is' : 'budgets are'} set in the current base currency. Delete them to choose a different base currency.`,
  },
};
