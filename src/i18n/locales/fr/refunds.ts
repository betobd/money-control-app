import type { refunds as en } from '../en/refunds';

export const refunds: typeof en = {
  title: 'Ajouter un remboursement',
  cancel: 'Annuler le remboursement',
  loadingExpense: 'Chargement de la dépense…',
  expenseNotFound: 'Dépense introuvable.',
  originalExpense: 'Dépense d’origine',
  expenseFallback: 'Dépense',
  gross: 'Brut',
  refunded: 'Remboursé',
  remaining: 'Restant',
  explanation: (account: string) =>
    `Un remboursement réduit les dépenses et rend l’argent à ${account}. Ce n’est pas un revenu.`,
  amountLabel: (currency: string) => `Montant du remboursement (${currency})`,
  amountA11y: (currencyName: string) => `Montant du remboursement en ${currencyName}`,
  maximumRefundable: (amount: string) => `Remboursable au maximum : ${amount}`,
  foreignRateNote: (currency: string, base: string) =>
    `Un remboursement en ${currency} utilise le taux de référence ${currency}/${base} actuellement enregistré. Votre banque peut appliquer un autre taux.`,
  date: 'Date du remboursement',
  noteOptional: 'Note (facultatif)',
  noteA11y: 'Note du remboursement, facultatif',
  notePlaceholder: 'Remboursement du commerçant, correction…',
  save: 'Enregistrer le remboursement',
  errors: {
    validationFailed: 'La validation du remboursement a échoué.',
    missingRate: (currency: string, base: string) =>
      `Ajoutez un taux de change ${currency}/${base} avant d’enregistrer ce remboursement.`,
    unableToSave: 'Impossible d’enregistrer le remboursement.',
    unableToLoadSummary: 'Impossible de charger le détail du remboursement.',
    originalNotFound: 'La dépense d’origine n’existe plus.',
    notPostedExpense: 'Les remboursements ne peuvent être ajoutés qu’à une dépense enregistrée.',
    dateBeforeExpense: 'La date du remboursement ne peut pas précéder celle de la dépense d’origine.',
    dateInFuture: 'La date du remboursement ne peut pas être dans le futur.',
    exceedsRemaining: 'Le remboursement ne peut pas dépasser le montant restant remboursable.',
    fullyRefunded: 'Cette dépense a déjà été entièrement remboursée.',
    notFound: 'Remboursement introuvable.',
    alreadyVoided: 'Le remboursement est déjà annulé.',
    changedBeforeVoid: 'Le remboursement a été modifié avant de pouvoir être annulé.',
    unableToLoadVoided: 'Impossible de charger le remboursement annulé.',
    unableToVoid: 'Impossible d’annuler le remboursement.',
  },
};
