import type { home as en } from '../en/home';

export const home: typeof en = {
  loadError: 'Impossible de charger votre tableau de bord pour le moment.',
  loadingDashboard: 'Chargement de votre tableau de bord',

  selectedMonth: (month) => `Mois sélectionné, ${month}`,
  previousMonthHint: 'Affiche le résumé et les budgets du mois précédent',
  nextMonthHint: 'Affiche le résumé et les budgets du mois suivant',

  totalBalance: 'Solde total',
  estimatedNetWorth: 'Patrimoine net estimé',
  netWorthIncompleteLabel: (currencies) =>
    `Le patrimoine net estimé est incomplet, car aucun taux de change n’est disponible pour ${currencies}`,
  estimatedIncomplete: 'Estimation — incomplète',
  netInMonth: (month) => `net en ${month}`,

  income: 'Revenus',
  refunds: 'Remboursements',
  netExpenses: 'Dépenses nettes',
  netResult: 'Résultat net',

  investments: 'Placements',
  investmentsHint: 'Ouvre l’écran des placements',
  investmentsLabel: (value) => `Placements, valeur actuelle ${value}`,
  investmentsIncompleteValue: 'estimation incomplète',
  viewInvestments: 'Voir les placements',
  gainLossUnavailable: 'Gain/perte estimé indisponible',
  gainLoss: (amount) => `${amount} de gain/perte estimé`,
  asOf: (date) => `au ${date}`,

  monthlyCeiling: 'Plafond mensuel',
  monthlyBudget: 'Budget mensuel',
  budgetCardLabel: (title, spent, total, percentage, over) =>
    `${title}, ${spent} dépensés sur ${total}, ${percentage} % utilisés${over ? ', budget dépassé' : ''}`,
  noBudgets: 'Aucun budget défini pour ce mois',
  percentUsed: (percentage) => `${percentage} % utilisés`,
  overBudget: 'Dépassé',
  spent: (amount) => `${amount} dépensés`,
  ofTotal: (amount) => `sur ${amount}`,
  ceilingNote: 'Toutes les dépenses du mois, y compris celles qu’aucun budget par catégorie ne couvre.',
  byCategory: 'Par catégorie',
  viewAll: 'Tout voir',
  viewAllBudgets: 'Voir tous les budgets',
  categoryRowLabel: (category, percentage, over) =>
    `${category}, ${percentage} % utilisés${over ? ', budget dépassé' : ''}`,

  recentTransactions: 'Transactions récentes',
  viewAllTransactions: 'Voir toutes les transactions',
  noRecentTransactions: 'Aucune transaction récente.',
};
