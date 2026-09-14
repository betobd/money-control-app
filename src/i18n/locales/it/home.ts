import type { home as en } from '../en/home';

export const home: typeof en = {
  loadError: 'Impossibile caricare la tua panoramica in questo momento.',
  loadingDashboard: 'Caricamento della panoramica',

  selectedMonth: (month) => `Mese selezionato, ${month}`,
  previousMonthHint: 'Mostra riepilogo e budget del mese precedente',
  nextMonthHint: 'Mostra riepilogo e budget del mese successivo',

  totalBalance: 'Saldo totale',
  estimatedNetWorth: 'Patrimonio netto stimato',
  netWorthIncompleteLabel: (currencies) =>
    `Il patrimonio netto stimato è incompleto perché non è disponibile un tasso di cambio per ${currencies}`,
  estimatedIncomplete: 'Stimato — incompleto',
  netInMonth: (month) => `netto a ${month}`,

  income: 'Entrate',
  refunds: 'Rimborsi',
  netExpenses: 'Uscite nette',
  netResult: 'Risultato netto',

  investments: 'Investimenti',
  investmentsHint: 'Apre la schermata degli investimenti',
  investmentsLabel: (value) => `Investimenti, valore attuale ${value}`,
  investmentsIncompleteValue: 'stimato, incompleto',
  viewInvestments: 'Vedi investimenti',
  gainLossUnavailable: 'Guadagno/perdita stimato non disponibile',
  gainLoss: (amount) => `${amount} di guadagno/perdita stimato`,
  asOf: (date) => `al ${date}`,

  monthlyCeiling: 'Tetto mensile',
  monthlyBudget: 'Budget mensile',
  budgetCardLabel: (title, spent, total, percentage, over) =>
    `${title}, ${spent} spesi su ${total}, ${percentage}% usato${over ? ', budget superato' : ''}`,
  noBudgets: 'Nessun budget impostato per questo mese',
  percentUsed: (percentage) => `${percentage}% usato`,
  overBudget: 'Superato',
  spent: (amount) => `${amount} spesi`,
  ofTotal: (amount) => `su ${amount}`,
  ceilingNote: 'Tutta la spesa del mese, compresa quella non coperta da alcun budget per categoria.',
  byCategory: 'Per categoria',
  viewAll: 'Vedi tutto',
  viewAllBudgets: 'Vedi tutti i budget',
  categoryRowLabel: (category, percentage, over) =>
    `${category}, ${percentage}% usato${over ? ', budget superato' : ''}`,

  recentTransactions: 'Movimenti recenti',
  viewAllTransactions: 'Vedi tutti i movimenti',
  noRecentTransactions: 'Nessun movimento recente.',
};
