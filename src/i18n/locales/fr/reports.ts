import type { reports as en } from '../en/reports';
import { createPlural } from '../../plural';

const plural = createPlural('fr');

export const reports: typeof en = {
  title: 'Rapports',
  headerSubtitle: 'Votre historique financier enregistré',
  backFromReports: 'Retour depuis Rapports',
  loadingReports: 'Chargement des rapports',
  loadErrorTitle: 'Impossible de charger les rapports',
  loadError: 'Impossible de charger les rapports.',
  budgetsLoadError: 'Impossible de charger les budgets de cette période.',
  updating: 'Mise à jour de toutes les sections du rapport…',

  presetCurrentMonth: 'Mois en cours',
  presetPreviousMonth: 'Mois précédent',
  presetLast3Months: '3 derniers mois',
  presetLast6Months: '6 derniers mois',
  presetCurrentYear: 'Année en cours',
  presetCustom: 'Personnalisé',
  startDate: 'Date de début',
  endDate: 'Date de fin',
  applyRange: 'Appliquer',
  applyRangeLabel: 'Appliquer la période personnalisée du rapport',
  invalidPeriod: 'Période de rapport non valide.',
  selectedPeriod: (label) => `Période de rapport sélectionnée, ${label}`,

  invalidToday: 'Impossible de déterminer une date locale valide pour Bogotá.',
  invalidCustomDates: 'Saisissez des dates de début et de fin valides au format AAAA-MM-JJ.',
  endBeforeStart: 'La date de fin ne peut pas précéder la date de début.',

  netWorthStart: 'Début',
  unknownCategory: 'Catégorie inconnue',
  noSubcategory: 'Sans sous-catégorie',

  emptyTitle: 'Aucun revenu ni dépense enregistré',
  emptyDescription:
    'Les totaux restent à zéro pour cette période. Les virements, les transactions annulées et les occurrences récurrentes à traiter ou ignorées ne comptent pas.',

  summaryTitle: 'Résumé de la période',
  summaryDescription: 'Revenus et dépenses enregistrés sur la période sélectionnée.',
  netResult: 'Résultat net',
  income: 'Revenus',
  expenses: 'Dépenses',
  net: 'Net',
  netExpenses: 'Dépenses nettes',
  grossExpenses: 'Dépenses brutes',
  refunds: 'Remboursements',
  averageExpense: 'Dépense moyenne',
  expenseTransactions: 'Transactions de dépense',
  incomeTransactions: 'Transactions de revenu',
  refundTransactions: 'Transactions de remboursement',
  largestExpense: 'Plus grosse dépense',
  noLargestExpense: 'Aucune dépense enregistrée sur cette période.',
  savingsRateNotApplicable: 'Aucun revenu sur cette période : le taux d’épargne ne s’applique pas.',
  savingsRate: (percentage) => `Vous avez gardé ${percentage} de ce que vous avez gagné.`,
  showDetails: 'Afficher le détail',
  hideDetails: 'Masquer le détail',
  showSummaryDetails: 'Afficher le détail du résumé',
  hideSummaryDetails: 'Masquer le détail du résumé',

  cashFlowTitle: 'Revenus et dépenses',
  cashFlowDescriptionDay:
    'Une colonne par jour (heure de Bogotá). Les revenus montent au-dessus de la ligne, les dépenses descendent en dessous.',
  cashFlowDescriptionMonth:
    'Une colonne par mois civil. Les revenus montent au-dessus de la ligne, les dépenses descendent en dessous.',
  wholePeriod: 'Toute la période',
  cashFlowChartLabel: (income, expenses) =>
    `Graphique des flux de trésorerie. Revenus totaux ${income}. Dépenses totales ${expenses}.`,
  cashFlowHint: 'Touchez une colonne pour voir son détail.',
  cashFlowHintSelected: 'Touchez à nouveau la colonne pour voir toute la période.',

  paceTitle: 'Rythme des dépenses',
  paceDescription: (previousPeriod) =>
    `Cumul des dépenses nettes, comparé au même moment de la période précédente (${previousPeriod}).`,
  previousPeriod: 'Période précédente',
  thisPeriod: 'Cette période',
  spentSoFar: 'Dépensé à ce jour',
  versusLast: (signedAmount) => `${signedAmount} vs précédente`,
  paceChartLabel: (spent, previousAmount, previousPeriod) =>
    `Dépenses cumulées. ${spent} à ce jour, contre ${previousAmount} au même moment (${previousPeriod}).`,

  budgetTitle: 'Budget et réel',
  budgetDescription:
    'Budgets par catégorie comparés aux dépenses réelles. Les dépenses sont déjà nettes des remboursements et excluent les virements.',
  budgetSumHint: (monthCount) =>
    `Les plafonds additionnent ${monthCount} budgets mensuels ; les budgets ne sont jamais proratisés.`,
  budgetRowLabel: (category, spent, limit, percentage) =>
    `${category}, ${spent} dépensés sur ${limit}, ${percentage} % utilisés`,
  spentOfLimit: (spent, limit) => `${spent} sur ${limit}`,
  remaining: (amount) => `${amount} restants`,
  over: (amount) => `${amount} de dépassement`,

  weekdayTitle: 'Dépenses par jour de la semaine',
  weekdayDescription:
    'Dépense nette moyenne par jour de la semaine, divisée par le nombre de fois où ce jour figure dans la période.',
  weekdayColumnLabel: (shortDay, longDay, average, dayCount) =>
    `${longDay}, moyenne de ${average} sur ${dayCount} ${plural(dayCount, 'jour', 'jours')}`,
  heaviestDay: (shortDay, longDay, weekday, amount) =>
    `Le ${longDay} est votre jour le plus dépensier : ${amount} en moyenne.`,
  noWeekdayExpenses: 'Aucune dépense à comparer entre les jours de la semaine.',

  categoryTitle: 'Dépenses par catégorie',
  categoryDescription:
    'Toutes les dépenses enregistrées, classées par identifiant fixe de catégorie, y compris les catégories archivées.',
  categoryEmpty: 'Aucune dépense enregistrée à classer sur cette période.',
  donutLabel: (total) => `Dépenses par catégorie. Total ${total}.`,
  totalExpenses: 'Dépenses totales',
  otherCategories: (count) => `Autres (${count})`,
  expensesRanked: 'Dépenses classées par catégorie',
  transactionCount: (count) => `${count} ${plural(count, 'transaction', 'transactions')}`,
  inDetail: (count) => `${count} en détail`,
  shareOfCategory: (percentage, category) => `${percentage} de ${category}`,
  showBreakdownHint: 'Affiche le détail par sous-catégorie',
  hideBreakdownHint: 'Masque le détail par sous-catégorie',

  netWorthTitle: 'Évolution du patrimoine net',
  netWorthDescriptionDay: (date) =>
    `Part du patrimoine net avant le ${date}, puis applique l’historique enregistré jusqu’à chaque jour.`,
  netWorthDescriptionMonth: (date) =>
    `Part du patrimoine net avant le ${date}, puis applique l’historique enregistré jusqu’à chaque fin de mois.`,
  noNetWorthHistory: 'Aucun historique de patrimoine net pour cette période.',
  endingNetWorth: 'Patrimoine net final',
  netWorthChartLabel: (start, end) =>
    `Évolution du patrimoine net. Débute à ${start}, termine à ${end}.`,

  investmentsTitle: 'Placements',
  investmentsDescription:
    'Position actuelle des placements (estimée) plus les revenus de placement réalisés sur la période. Les variations de valorisation latentes augmentent le patrimoine net mais ne comptent jamais comme revenu ordinaire.',
  currentValue: 'Valeur actuelle',
  estimatedIncomplete: 'Estimation — incomplète',
  netContributions: 'Versements nets',
  estimatedGainLoss: 'Gain/perte estimé',
  simpleEstimatedReturn: 'Rendement simple estimé',
  investmentIncomePeriod: 'Revenus de placement (période)',

  comparisonTitle: 'Comparaison avec la période précédente',
  comparisonDescription: (previousPeriod) =>
    `Comparé à la période précédente (${previousPeriod}). Une hausse des dépenses est signalée comme négative.`,
  noChange: 'Aucun changement',
  noPreviousData: 'Aucune donnée pour la période précédente',
  percentageUnavailable: 'pourcentage indisponible',
  increasedBy: (difference, percentage) => `En hausse de ${difference} (${percentage})`,
  decreasedBy: (difference, percentage) => `En baisse de ${difference} (${percentage})`,
  comparisonRowLabel: (label, current, change) => `${label}. Actuel ${current}. ${change}.`,
};
