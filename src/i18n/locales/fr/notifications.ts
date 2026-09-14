import type { notifications as en, ReminderTiming } from '../en/notifications';
import { createPlural } from '../../plural';

const plural = createPlural('fr');

// "à venir" / "en retard" / "à traiter aujourd'hui" read the same for a
// "transaction" or a "virement".
const timingText = (timing: ReminderTiming) =>
  timing === 'upcoming' ? 'est à venir' : timing === 'overdue' ? 'est en retard' : 'est à traiter aujourd’hui';

export const notifications: typeof en = {
  channels: {
    recurringName: 'Rappels récurrents',
    recurringDescription: 'Rappels des transactions récurrentes à traiter et à venir',
    budgetsName: 'Alertes de budget',
    budgetsDescription: 'Alertes lorsque les budgets mensuels approchent ou atteignent leur limite',
    creditCardsName: 'Rappels de carte de crédit',
    creditCardsDescription: 'Rappels de clôture du relevé et d’échéance de paiement',
    dailyName: 'Rappels quotidiens',
    dailyDescription: 'Rappels discrets pour faire le point sur vos finances',
  },

  content: {
    reminderTitle: 'Rappel Money Control',
    recurringPrivate: (timing) =>
      timing === 'upcoming'
        ? 'Vous avez une transaction récurrente à venir à vérifier.'
        : timing === 'overdue'
          ? 'Vous avez une transaction récurrente en retard à vérifier.'
          : 'Vous avez une transaction récurrente à vérifier.',
    recurringTransfer: (amount, timing) =>
      `Un virement récurrent de ${amount} ${timingText(timing)}.`,
    recurringCategory: (category, amount, timing) =>
      category
        ? `La transaction récurrente ${category} de ${amount} ${timingText(timing)}.`
        : `Une transaction récurrente de ${amount} ${timingText(timing)}.`,
    budgetReachedTitle: 'Limite de budget atteinte',
    budgetNearingTitle: 'Budget proche de la limite',
    budgetReachedPrivate: 'Un budget a atteint sa limite.',
    budgetNearingPrivate: 'Un budget approche de sa limite.',
    budgetReachedDetail: (label, month) => `${label} a atteint son budget de ${month}.`,
    budgetNearingDetail: (label, percent, month) =>
      `${label} a utilisé ${percent} % de son budget de ${month}.`,
    dailyBody: 'Prenez un moment pour faire le point sur vos finances.',
    testTitle: 'Test Money Control',
    testBody: 'Les rappels locaux sont prêts sur cet appareil.',
    cardClosingTitle: 'Clôture du relevé bientôt',
    cardDueTitle: 'Paiement de carte à échéance',
    cardClosingPrivate: 'Le relevé d’une carte de crédit sera bientôt clôturé.',
    cardDuePrivate: 'Le paiement d’une carte de crédit arrive bientôt à échéance.',
    cardClosingDetail: (card, date) => `Le relevé de ${card} sera clôturé le ${date}.`,
    cardDueDetail: (card, amount, date) =>
      `${card} : ${amount} restant à payer, échéance le ${date}.`,
  },

  settings: {
    title: 'Notifications',
    loadingLabel: 'Chargement des paramètres de notification',
    backLabel: 'Retour depuis les paramètres de notification',
    allowTitle: 'Autoriser les rappels locaux ?',
    allowMessage: 'Money Control utilise les notifications Android uniquement pour les catégories de rappels que vous choisissez. Aucune donnée financière ne quitte cet appareil.',
    continue: 'Continuer',
    notNow: 'Plus tard',
    permissionSection: 'Autorisation Android',
    openAndroidSettings: 'Ouvrir les paramètres Android',
    enableNotifications: 'Activer les notifications',
    enableTitle: 'Activer les rappels locaux ?',
    enableMessage: 'Android vous demandera si Money Control peut afficher les rappels que vous choisissez.',
    pauseAll: 'Suspendre tous les rappels',
    resume: 'Reprendre les notifications',
    categoriesSection: 'Catégories de rappels',
    recurringDescription: 'Éléments récurrents à traiter, en retard et à venir',
    recurringLabel: 'Transactions récurrentes',
    reminderTime: 'Heure du rappel',
    advanceNotice: 'Préavis',
    sameDay: 'Le jour même',
    advanceDays: (days) => `${days} ${plural(days, 'jour', 'jours')}`,
    budgetsDescription: 'Une alerte vers 80 % et une à 100 %',
    budgetsLabel: 'Seuils de budget',
    cardsDescription: 'Rappels de clôture du relevé et d’échéance de paiement',
    cardsLabel: 'Cartes de crédit',
    closingDescription: 'Un jour avant la date de clôture calculée',
    closingLabel: 'Rappel de clôture',
    paymentDueReminders: 'Rappels d’échéance',
    dueThreeDaysDescription: 'Trois jours avant l’échéance du relevé',
    dueThreeDaysLabel: '3 jours avant',
    dueOneDayDescription: 'Un jour avant l’échéance du relevé',
    dueOneDayLabel: '1 jour avant',
    dueTodayDescription: 'Le jour de l’échéance du relevé',
    dueTodayLabel: 'Échéance du jour',
    dailyDescription: 'Un rappel quotidien discret pour faire le point sur vos finances',
    dailyLabel: 'Point quotidien',
    dailyTime: 'Heure du rappel quotidien',
    privacySection: 'Confidentialité des notifications',
    private: 'Privé',
    detailed: 'Détaillé',
    privacyDescription: 'Privé masque les montants, comptes, catégories, soldes et notes. Détaillé peut afficher une catégorie et un montant, mais jamais les notes ni les détails complets du compte.',
    appLockWarning: 'Le verrouillage de l’app est activé. Le contenu privé est recommandé pour la confidentialité de l’écran de verrouillage.',
    testSection: 'Test et distribution',
    sendTest: 'Envoyer une notification test',
    cancelTest: 'Annuler le test en attente',
    deliveryDescription: 'Les heures de rappel suivent l’horloge locale de l’appareil. Les dates financières récurrentes restent des dates du calendrier de Bogotá. Android peut retarder la distribution en mode Doze ou avec l’optimisation de la batterie.',
    attentionTitle: 'Certains rappels demandent votre attention',
    attentionBody: 'Money Control n’a pas pu terminer la dernière mise à jour des notifications. Les données financières ont été enregistrées normalement.',
    dismissMessage: 'Fermer le message',
    currentValue: (value) => `Valeur actuelle ${value}`,
    chooseTime: 'Choisir l’heure locale',
    hour: 'Heure',
    minute: 'Minute',
    saveTime: (time) => `Enregistrer ${time}`,
    permissionGrantedTitle: 'Autorisé par Android',
    permissionBlockedTitle: 'Bloqué dans les paramètres Android',
    permissionDeniedTitle: 'Autorisation refusée',
    permissionUnavailableTitle: 'Notifications indisponibles',
    permissionNotEnabledTitle: 'Pas encore activées',
    permissionGrantedDescription: 'Android peut afficher les catégories de rappels locaux que vous activez ci-dessous.',
    permissionBlockedDescription: 'Ouvrez les paramètres Android pour autoriser les notifications. Money Control continue de fonctionner normalement.',
    permissionDeniedDescription: 'Vous pourrez réessayer quand vous le souhaitez. Aucune autorisation de rappel n’est nécessaire pour utiliser l’app.',
    permissionUnavailableDescription: 'Cet environnement ne peut pas programmer de notifications Android. Les fonctions financières ne sont pas affectées.',
    permissionNotEnabledDescription: 'Money Control ne demandera l’autorisation qu’après que vous aurez choisi d’activer les rappels locaux.',
  },

  results: {
    loadFailed: 'Les paramètres de notification n’ont pas pu être chargés.',
    changeFailed: 'La modification des notifications n’a pas pu aboutir. Réessayez.',
    permissionUpdated: 'Autorisation de notification mise à jour.',
    paused: 'Tous les rappels Money Control sont suspendus.',
    reminderEnabled: 'Rappel activé.',
    reminderDisabled: 'Rappel désactivé.',
    recurringTimeUpdated: 'Heure du rappel récurrent mise à jour.',
    advanceUpdated: 'Préavis mis à jour.',
    dailyTimeUpdated: 'Heure du rappel quotidien mise à jour.',
    privacyUpdated: 'Confidentialité des notifications mise à jour.',
    cardClosingUpdated: 'Rappel de clôture de carte mis à jour.',
    cardDueUpdated: 'Rappel d’échéance de carte mis à jour.',
    testScheduled: 'Notification test programmée dans environ cinq secondes.',
    testCanceled: 'Notification test annulée.',
  },
};
