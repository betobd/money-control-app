import type { home as en } from '../en/home';

export const home: typeof en = {
  loadError: 'Deine Übersicht kann gerade nicht geladen werden.',
  loadingDashboard: 'Deine Übersicht wird geladen',

  selectedMonth: (month) => `Ausgewählter Monat, ${month}`,
  previousMonthHint: 'Zeigt Übersicht und Budgets des Vormonats',
  nextMonthHint: 'Zeigt Übersicht und Budgets des nächsten Monats',

  totalBalance: 'Gesamtsaldo',
  estimatedNetWorth: 'Geschätztes Nettovermögen',
  netWorthIncompleteLabel: (currencies) =>
    `Das geschätzte Nettovermögen ist unvollständig, weil für ${currencies} kein Wechselkurs verfügbar ist`,
  estimatedIncomplete: 'Geschätzt – unvollständig',
  netInMonth: (month) => `netto im ${month}`,

  income: 'Einnahmen',
  refunds: 'Erstattungen',
  netExpenses: 'Nettoausgaben',
  netResult: 'Nettoergebnis',

  investments: 'Geldanlagen',
  investmentsHint: 'Öffnet die Geldanlagen',
  investmentsLabel: (value) => `Geldanlagen, aktueller Wert ${value}`,
  investmentsIncompleteValue: 'geschätzt, unvollständig',
  viewInvestments: 'Geldanlagen ansehen',
  gainLossUnavailable: 'Geschätzter Gewinn/Verlust nicht verfügbar',
  gainLoss: (amount) => `${amount} geschätzter Gewinn/Verlust`,
  asOf: (date) => `Stand ${date}`,

  monthlyCeiling: 'Monatslimit',
  monthlyBudget: 'Monatsbudget',
  budgetCardLabel: (title, spent, total, percentage, over) =>
    `${title}, ${spent} von ${total} ausgegeben, ${percentage} % genutzt${over ? ', Budget überschritten' : ''}`,
  noBudgets: 'Keine Budgets für diesen Monat',
  percentUsed: (percentage) => `${percentage} % genutzt`,
  overBudget: 'Überschritten',
  spent: (amount) => `${amount} ausgegeben`,
  ofTotal: (amount) => `von ${amount}`,
  ceilingNote: 'Alle Ausgaben dieses Monats, auch was kein Kategorie-Budget abdeckt.',
  byCategory: 'Nach Kategorie',
  viewAll: 'Alle ansehen',
  viewAllBudgets: 'Alle Budgets ansehen',
  categoryRowLabel: (category, percentage, over) =>
    `${category}, ${percentage} % genutzt${over ? ', Budget überschritten' : ''}`,

  recentTransactions: 'Letzte Buchungen',
  viewAllTransactions: 'Alle Buchungen ansehen',
  noRecentTransactions: 'Keine aktuellen Buchungen.',
};
