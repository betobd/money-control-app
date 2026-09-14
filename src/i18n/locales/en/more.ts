export const more = {
  title: 'More',
  closeLabel: 'Close More',
  items: {
    security: {
      label: 'Security',
      description: 'PIN, biometrics, and automatic locking',
      accessibilityLabel: 'Open security settings',
      accessibilityHint: 'Configure PIN, device biometrics, and automatic App Lock',
    },
    notifications: {
      label: 'Notifications',
      description: 'Local reminders and notification privacy',
      accessibilityLabel: 'Open notification settings',
      accessibilityHint: 'Configure local recurring, budget, and daily reminders',
    },
    backup: {
      label: 'Backup & Restore',
      description: 'Back up or restore a complete local copy',
      accessibilityLabel: 'Open backup and restore',
      accessibilityHint: 'Create a local backup or replace local data from a backup file',
    },
    dataExport: {
      label: 'Data Export',
      description: 'Readable CSV files for analysis and sharing',
      accessibilityLabel: 'Open data export',
      accessibilityHint: 'Create readable CSV files for spreadsheets, analysis, and sharing',
    },
    investments: {
      label: 'Investments',
      description: 'Track balances, valuations, and estimated returns',
      accessibilityLabel: 'Open investments',
      accessibilityHint: 'Review investment accounts, valuations, and estimated gain or loss',
    },
    reports: {
      label: 'Reports',
      description: 'Explore cash flow, categories, and net worth',
      accessibilityLabel: 'Open reports',
      accessibilityHint: 'Review income, expenses, categories, net worth, and period comparisons',
    },
    currency: {
      label: 'Currency & Rates',
      description: 'Base currency and exchange rates',
      accessibilityLabel: 'Open currency and rates',
      accessibilityHint: 'Review the base currency and exchange rates',
    },
    categories: {
      label: 'Categories',
      description: 'Manage expense and income categories',
      accessibilityLabel: 'Manage categories',
      accessibilityHint: 'Create, edit, archive, and restore categories',
    },
    recurring: {
      label: 'Recurring Transactions',
      description: 'Review, confirm, pause, and schedule recurring items',
      accessibilityLabel: 'Manage recurring transactions',
      accessibilityHint: 'Review due occurrences and manage recurring rules',
    },
    language: {
      label: 'Language',
      accessibilityLabel: 'Change language',
      accessibilityHint: 'Choose the language of the app',
    },
  },
  language: {
    title: 'Language',
    intro: 'Choose the language of the app. Default categories you have not renamed are translated too.',
    deviceOption: 'Same as device',
    deviceDetail: (languageName: string) => `Currently ${languageName}`,
    selectedHint: 'Selected',
    changeFailed: 'The language could not be changed. Try again.',
  },
};
