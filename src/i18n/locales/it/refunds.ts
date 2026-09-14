import type { refunds as en } from '../en/refunds';

export const refunds: typeof en = {
  title: 'Aggiungi rimborso',
  cancel: 'Annulla rimborso',
  loadingExpense: 'Caricamento dell’uscita…',
  expenseNotFound: 'Uscita non trovata.',
  originalExpense: 'Uscita originale',
  expenseFallback: 'Uscita',
  gross: 'Lordo',
  refunded: 'Rimborsato',
  remaining: 'Residuo',
  explanation: (account: string) =>
    `Un rimborso riduce le uscite e restituisce il denaro a ${account}. Non è un’entrata.`,
  amountLabel: (currency: string) => `Importo del rimborso (${currency})`,
  amountA11y: (currencyName: string) => `Importo del rimborso in ${currencyName}`,
  maximumRefundable: (amount: string) => `Massimo rimborsabile: ${amount}`,
  foreignRateNote: (currency: string, base: string) =>
    `Un rimborso in ${currency} usa il tasso di riferimento ${currency}/${base} attualmente salvato. La tua banca potrebbe usare un tasso diverso.`,
  date: 'Data del rimborso',
  noteOptional: 'Nota (facoltativa)',
  noteA11y: 'Nota del rimborso, facoltativa',
  notePlaceholder: 'Rimborso del negozio, correzione…',
  save: 'Salva rimborso',
  errors: {
    validationFailed: 'Impossibile convalidare il rimborso.',
    missingRate: (currency: string, base: string) =>
      `Aggiungi un tasso di cambio ${currency}/${base} prima di salvare questo rimborso.`,
    unableToSave: 'Impossibile salvare il rimborso.',
    unableToLoadSummary: 'Impossibile caricare i dettagli del rimborso.',
    originalNotFound: 'L’uscita originale non esiste più.',
    notPostedExpense: 'I rimborsi possono essere aggiunti solo a un’uscita registrata.',
    dateBeforeExpense: 'La data del rimborso non può precedere l’uscita originale.',
    dateInFuture: 'La data del rimborso non può essere nel futuro.',
    exceedsRemaining: 'Il rimborso non può superare l’importo ancora rimborsabile.',
    fullyRefunded: 'Questa uscita è già stata rimborsata completamente.',
    notFound: 'Rimborso non trovato.',
    alreadyVoided: 'Il rimborso è già annullato.',
    changedBeforeVoid: 'Il rimborso è cambiato prima di poter essere annullato.',
    unableToLoadVoided: 'Impossibile caricare il rimborso annullato.',
    unableToVoid: 'Impossibile annullare il rimborso.',
  },
};
