import type { refunds as en } from '../en/refunds';

export const refunds: typeof en = {
  title: 'Erstattung hinzufügen',
  cancel: 'Erstattung abbrechen',
  loadingExpense: 'Ausgabe wird geladen…',
  expenseNotFound: 'Ausgabe nicht gefunden.',
  originalExpense: 'Ursprüngliche Ausgabe',
  expenseFallback: 'Ausgabe',
  gross: 'Brutto',
  refunded: 'Erstattet',
  remaining: 'Offen',
  explanation: (account: string) =>
    `Eine Erstattung verringert die Ausgaben und bringt das Geld zurück auf ${account}. Sie ist keine Einnahme.`,
  amountLabel: (currency: string) => `Erstattungsbetrag (${currency})`,
  amountA11y: (currencyName: string) => `Erstattungsbetrag in ${currencyName}`,
  maximumRefundable: (amount: string) => `Maximal erstattbar: ${amount}`,
  foreignRateNote: (currency: string, base: string) =>
    `Eine Erstattung in ${currency} verwendet den aktuell gespeicherten Referenzkurs ${currency}/${base}. Deine Bank verwendet eventuell einen anderen Kurs.`,
  date: 'Erstattungsdatum',
  noteOptional: 'Notiz (optional)',
  noteA11y: 'Notiz zur Erstattung, optional',
  notePlaceholder: 'Händlererstattung, Korrektur…',
  save: 'Erstattung speichern',
  errors: {
    validationFailed: 'Die Erstattung konnte nicht geprüft werden.',
    missingRate: (currency: string, base: string) =>
      `Füge einen Wechselkurs ${currency}/${base} hinzu, bevor du diese Erstattung speicherst.`,
    unableToSave: 'Die Erstattung konnte nicht gespeichert werden.',
    unableToLoadSummary: 'Die Erstattungsdetails konnten nicht geladen werden.',
    originalNotFound: 'Die ursprüngliche Ausgabe existiert nicht mehr.',
    notPostedExpense: 'Erstattungen können nur zu einer gebuchten Ausgabe hinzugefügt werden.',
    dateBeforeExpense: 'Das Erstattungsdatum darf nicht vor der ursprünglichen Ausgabe liegen.',
    dateInFuture: 'Das Erstattungsdatum darf nicht in der Zukunft liegen.',
    exceedsRemaining: 'Die Erstattung darf den noch erstattbaren Betrag nicht übersteigen.',
    fullyRefunded: 'Diese Ausgabe wurde bereits vollständig erstattet.',
    notFound: 'Erstattung nicht gefunden.',
    alreadyVoided: 'Die Erstattung ist bereits storniert.',
    changedBeforeVoid: 'Die Erstattung wurde geändert, bevor sie storniert werden konnte.',
    unableToLoadVoided: 'Die stornierte Erstattung konnte nicht geladen werden.',
    unableToVoid: 'Die Erstattung konnte nicht storniert werden.',
  },
};
