import type { dataExport as en } from '../en/data-export';
import { createPlural } from '../../plural';

const plural = createPlural('it');

export const dataExport: typeof en = {
  title: 'Esporta dati',
  sizeBytes: (bytes: number) => `circa ${bytes} B`,
  sizeKib: (kib: number) => `circa ${kib} KiB`,
  sizeMib: (mib: string) => `circa ${mib} MiB`,
  confirmMessage: (detail: string) =>
    `I file CSV possono contenere informazioni finanziarie sensibili. Chiunque abbia accesso al file può leggerlo. Il blocco app non protegge il file una volta uscito da Money Control.${detail ? `\n\n${detail}` : ''}`,
  confirmLabel: 'Continua',
  warningTitle: 'Informazioni finanziarie non crittografate',
  warningBody: 'I file CSV sono leggibili da chiunque vi abbia accesso. Sono pensati per fogli di calcolo, analisi e condivisione, non per il ripristino completo dell’app.',
  notBackupTitle: 'Il CSV non è un backup',
  notBackupBody: 'Devi ripristinare Money Control in futuro? Backup e ripristino conserva ID e relazioni in un JSON con versione. Un CSV non può essere ripristinato.',
  openBackupHint: 'Apre la funzione di backup per il ripristino completo',
  openBackupLabel: 'Apri backup e ripristino',
  openBackupButton: 'Apri backup e ripristino',
  recordCount: (count: number) => `${count} record`,
  emptyCard: 'Ancora niente da esportare: questo CSV non avrebbe righe.',
  notRestorable: 'CSV leggibile · Non è un backup ripristinabile',
  notesPrivacy: 'Disattivato per impostazione predefinita per la privacy del file.',
  footerNote: 'I file vengono creati sul dispositivo, condivisi uno alla volta e rimossi dalla cache temporanea di Money Control alla chiusura della schermata nativa. Money Control non carica alcun dato.',

  transactionsTitle: 'Movimenti',
  transactionsDescription: 'Righe leggibili dei movimenti con conto di origine e destinazione, categoria, stato, date e note facoltative.',
  filterDate: (range: string) => `Data: ${range}`,
  filterType: (value: string) => `Tipo: ${value}`,
  filterStatus: (value: string) => `Stato: ${value}`,
  filterAccount: (value: string) => `Conto: ${value}`,
  filterCategory: (value: string) => `Categoria: ${value}`,
  allTypes: 'Tutti',
  allStatuses: 'Tutti',
  allAccounts: 'Tutti',
  allCategories: 'Tutte',
  typeValues: {
    expense: 'uscita',
    income: 'entrata',
    transfer: 'trasferimento',
    refund: 'rimborso',
  },
  statusValues: {
    posted: 'registrato',
    voided: 'annullato',
  },
  activeFilters: (count: number, size: string) =>
    `${count} ${plural(count, 'filtro attivo', 'filtri attivi')} · ${size}`,
  configureFiltersLabel: 'Configura i filtri di esportazione dei movimenti',
  configureFilters: 'Configura filtri',
  includeTransactionNotes: 'Includi note dei movimenti',
  noTransactionsMatch: 'Nessun movimento corrisponde ai filtri selezionati.',
  largeExport: 'Esportazione grande: la creazione può richiedere più tempo e più memoria.',
  transactionLimitExceeded: 'Restringi i filtri. Il limite di sicurezza di 50.000 righe è superato e non verrà creato alcun file parziale.',
  exportTransactionsButton: 'Esporta movimenti CSV',
  exportTransactionsTitle: 'Esportare i movimenti?',
  transactionNotesIncluded: 'Le note dei movimenti sono attive e verranno incluse.',
  transactionNotesExcluded: 'Le note dei movimenti sono escluse.',

  accountsTitle: 'Conti',
  accountsDescription: 'Conti attivi e archiviati con saldo iniziale e saldo attuale calcolato. I campi del debito delle carte usano il modello di saldo con segno.',
  accountsCaption: 'Include tutti i tipi di conto. Le colonne specifiche delle carte di credito restano vuote per gli altri conti.',
  exportAccountsButton: 'Esporta conti CSV',
  exportAccountsTitle: 'Esportare i conti?',

  budgetsTitle: 'Budget',
  budgetsDescription: 'Limiti mensili con le stesse spese calcolate, importo residuo, percentuale e stato mostrati in Budget.',
  previousBudgetMonth: 'Mese di budget precedente',
  nextBudgetMonth: 'Mese di budget successivo',
  selectedBudgetMonth: (month: string) => `Mese di budget selezionato: ${month}`,
  exportBudgetsButton: 'Esporta budget CSV',
  exportBudgetsTitle: 'Esportare i budget?',

  recurringTitle: 'Movimenti ricorrenti',
  recurringDescription: 'Solo modelli ricorrenti: pianificazione, stato, conti, categoria, importo e nota facoltativa. L’esportazione non genera mai occorrenze o movimenti.',
  includeRecurringNotes: 'Includi note ricorrenti',
  exportRecurringButton: 'Esporta regole ricorrenti CSV',
  exportRecurringTitle: 'Esportare le regole ricorrenti?',
  recurringNotesIncluded: 'Le note ricorrenti sono attive e verranno incluse.',
  recurringNotesExcluded: 'Le note ricorrenti sono escluse.',

  statementsTitle: 'Estratti conto delle carte',
  statementsDescription: 'Estratti conto passati con saldo e minimo indicati dalla banca, pagamenti attribuiti, importi residui e stato.',
  statementsCaption: 'Numeri di carta, CVV, date di scadenza, rateizzazioni dedotte o credenziali non vengono mai salvati né esportati.',
  exportStatementsButton: 'Esporta estratti conto CSV',
  exportStatementsTitle: 'Esportare gli estratti conto?',

  reportTitle: 'Riepilogo report',
  reportDescription: 'Una riga per ogni metrica di riepilogo, con gli stessi periodi e le stesse regole finanziarie usati in Report.',
  exportReportButton: 'Esporta riepilogo CSV',
  exportReportTitle: 'Esportare il riepilogo del report?',

  investmentsTitle: 'Investimenti',
  investmentsDescription: 'Conti di investimento con valore attuale, versamenti netti, guadagno/perdita stimati, rendimento semplice e valore stimato nella tua valuta principale (vuoto se manca il tasso di cambio). Gli investimenti archiviati sono inclusi.',
  investmentsCaption: 'I valori sono stimati dall’ultima valutazione manuale; guadagni o perdite non realizzati non contano mai come entrate.',
  exportInvestmentsButton: 'Esporta investimenti CSV',
  exportInvestmentsTitle: 'Esportare gli investimenti?',

  valuationsTitle: 'Valutazioni degli investimenti',
  valuationsDescription: 'Storico completo delle valutazioni manuali di ogni conto di investimento: data, valuta, valore e nota facoltativa.',
  valuationsCaption: 'Una riga per ogni valutazione registrata in tutti i conti di investimento.',
  exportValuationsButton: 'Esporta valutazioni CSV',
  exportValuationsTitle: 'Esportare le valutazioni?',

  unconfirmedCopy: (message: string) => `${message} Money Control non può confermare che una copia sia stata salvata.`,
  exportFailed: 'Impossibile completare l’esportazione CSV. I tuoi dati finanziari non sono stati modificati. Riprova.',
  overviewFailed: 'Impossibile caricare i conteggi per l’esportazione. Prova a riaprire questa schermata.',
  exportSucceeded: (fileName: string, rowCount: number, formattedRowCount: string) =>
    `${fileName} è stato creato con ${formattedRowCount} ${plural(rowCount, 'riga', 'righe')}. La schermata nativa per salvare/condividere si è chiusa; Money Control non può sapere se hai salvato, condiviso o annullato.`,

  noData: {
    transactions: 'Nessun movimento corrisponde alle opzioni selezionate.',
    accounts: 'Nessun conto corrisponde alle opzioni selezionate.',
    budgets: 'Nessun budget corrisponde alle opzioni selezionate.',
    recurringRules: 'Nessuna regola ricorrente corrisponde alle opzioni selezionate.',
    creditCardStatements: 'Nessun estratto conto corrisponde alle opzioni selezionate.',
    investments: 'Nessun investimento corrisponde alle opzioni selezionate.',
    investmentValuations: 'Nessuna valutazione corrisponde alle opzioni selezionate.',
  },
  rowLimitExceeded: (count: string, maximum: string) =>
    `Questa esportazione contiene ${count} righe, oltre il limite di sicurezza di ${maximum} righe. Restringi il periodo o i filtri e riprova.`,

  writeFailed: 'Impossibile creare il file CSV. Controlla lo spazio sul dispositivo e riprova.',
  sharingUnavailable: 'Il file CSV è stato creato, ma la schermata nativa di Android per salvare/condividere non è disponibile.',
  sharingOpenFailed: 'Il file CSV è stato creato, ma non è stato possibile aprire la schermata nativa di Android per salvare/condividere.',
  shareFailed: 'Il file CSV è stato creato, ma non è stato possibile condividerlo.',
  shareDialogTitle: 'Salva o condividi il CSV di Money Control',
};
