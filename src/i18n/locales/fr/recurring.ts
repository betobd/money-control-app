import { createPlural } from '../../plural';
import type { recurring as en } from '../en/recurring';

const plural = createPlural('fr');

export const recurring: typeof en = {
  title: 'Récurrentes',
  createRecurring: 'Créer une transaction récurrente',
  closeRecurring: 'Fermer les transactions récurrentes',
  sections: 'Sections des récurrentes',
  tabDue: 'À traiter',
  tabRules: 'Règles',
  tabHistory: 'Historique',
  updating: 'Mise à jour…',
  backlogLimited: 'Un important retard a été limité pour ce chargement. Rouvrez cet écran pour continuer en toute sécurité.',
  loadError: 'Impossible de charger les transactions récurrentes.',

  noneDue: 'Aucune transaction récurrente à traiter aujourd’hui.',
  dueOn: (date: string) => `À traiter : ${date}`,
  confirmOccurrence: (label: string) => `Confirmer ${label}`,
  editOccurrence: (label: string) => `Modifier l’occurrence ${label}`,
  skipOccurrence: (label: string) => `Ignorer l’occurrence ${label}`,
  skip: 'Ignorer',
  skipTitle: 'Ignorer cette occurrence ?',
  skipMessage: 'Elle restera dans l’historique des récurrentes et n’affectera ni les soldes ni les rapports.',
  unableToConfirm: 'Impossible de confirmer',
  confirmFallback: 'Vérifiez l’occurrence et réessayez.',
  unableToSkip: 'Impossible d’ignorer',
  tryAgain: 'Réessayez.',

  activeRules: 'Règles actives',
  pausedRules: 'Règles en pause',
  endedRules: 'Règles terminées',
  sectionCount: (title: string, count: number) => `${title} · ${count}`,
  createRule: 'Créer une règle',
  createFirstRule: 'Créer votre première règle récurrente',
  emptyTitle: 'Aucune règle récurrente',
  emptyBody: 'Créez une règle pour les dépenses, revenus ou virements que vous attendez régulièrement.',
  noActiveRules: 'Aucune règle active pour le moment. Les règles en pause et terminées sont listées ci-dessous.',
  ruleStatus: {
    active: 'Active',
    paused: 'En pause',
    ended: 'Terminée',
  },
  ruleStatusAccessibility: (status: string) => `Statut de la règle : ${status}`,
  nextOn: (date: string) => `Prochaine : ${date}`,
  editFuture: 'Modifier la suite',
  pause: 'Suspendre',
  resume: 'Reprendre',
  end: 'Terminer',
  endTitle: 'Terminer la transaction récurrente ?',
  endMessage: 'Aucune nouvelle occurrence ne sera générée. L’historique et les éléments à traiter sont conservés.',
  unableToUpdateRule: 'Impossible de modifier la règle',
  unableToEndRule: 'Impossible de terminer la règle',
  account: 'Compte',
  category: 'Catégorie',

  frequency: {
    daily: 'Quotidienne',
    weekly: 'Hebdomadaire',
    monthly: 'Mensuelle',
    yearly: 'Annuelle',
  },
  everyTwoWeeks: 'Toutes les deux semaines',
  everyInterval: (count, unit) => {
    if (unit === 'daily') return `Tous les ${count} ${plural(count, 'jour', 'jours')}`;
    if (unit === 'weekly') return `Toutes les ${count} ${plural(count, 'semaine', 'semaines')}`;
    if (unit === 'monthly') return `Tous les ${count} mois`;
    return `Tous les ${count} ${plural(count, 'an', 'ans')}`;
  },

  historyEmpty: 'Les occurrences confirmées et ignorées apparaîtront ici.',
  occurrenceStatus: {
    posted: 'Enregistrée',
    skipped: 'Ignorée',
  },
  occurrenceStatusSpoken: {
    pending: 'à traiter',
    posted: 'enregistrée',
    skipped: 'ignorée',
  },
  historyAccessibility: (status: string, label: string, amount: string, date: string) =>
    `${status}, ${label}, ${amount}, ${date}`,

  createTitle: 'Créer une transaction récurrente',
  editRuleTitle: 'Modifier la règle à venir',
  editOccurrenceTitle: 'Modifier cette occurrence',
  optionDaily: 'Quotidienne',
  optionWeekly: 'Hebdomadaire',
  optionEveryTwoWeeks: 'Toutes les 2 semaines',
  optionMonthly: 'Mensuelle',
  optionYearly: 'Annuelle',
  frequencyLabel: 'Fréquence',
  sourceAccount: 'Compte source',
  destinationAccount: 'Compte de destination',
  selectAccount: 'Choisir un compte',
  selectSourceAccount: 'Choisir le compte source',
  selectDestinationAccount: 'Choisir le compte de destination',
  selectIncomeCategory: 'Choisir une catégorie de revenu',
  selectExpenseCategory: 'Choisir une catégorie de dépense',
  startDate: 'Date de début',
  scheduledDate: 'Date prévue',
  endDateOptional: 'Date de fin (facultatif)',
  noteOptional: 'Note (facultatif)',
  noteAccessibility: 'Note de la transaction récurrente',
  notePlaceholder: 'Ajoutez une description…',
  saveRecurring: 'Enregistrer la transaction récurrente',
  saveError: 'Impossible d’enregistrer la transaction récurrente.',
  errorAmount: 'Saisissez un montant valide supérieur à zéro.',

  ruleLoadError: 'Impossible de charger la transaction récurrente.',
  occurrenceLoadError: 'Impossible de charger l’occurrence.',

  ruleNotFound: 'Transaction récurrente introuvable.',
  occurrenceNotFound: 'Occurrence récurrente introuvable.',
  alreadyHandled: 'Cette occurrence récurrente a déjà été traitée.',
  endedCannotEdit: 'Une transaction récurrente terminée ne peut pas être modifiée.',
  endedCannotResume: 'Une transaction récurrente terminée ne peut pas reprendre.',
  hasEnded: 'Cette transaction récurrente est terminée.',
  missingExchangeRate: (currency: string, baseCurrency: string) =>
    `Ajoutez un taux de change ${currency}/${baseCurrency} avant d’enregistrer cette transaction.`,
  errorDateFormat: 'Saisissez une date valide au format AAAA-MM-JJ.',
  errorFrequency: 'Sélectionnez une fréquence prise en charge.',
  errorInterval: 'L’intervalle doit être un nombre entier positif.',
  errorStartDate: 'Saisissez une date de début valide.',
  errorEndDate: 'Saisissez une date de fin valide.',
  errorEndBeforeStart: 'La date de fin ne peut pas précéder la date de début.',
  errorCrossCurrencyTransfer: 'Les virements récurrents entre devises différentes ne sont pas pris en charge.',
};
