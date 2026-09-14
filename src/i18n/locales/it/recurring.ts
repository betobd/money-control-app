import { createPlural } from '../../plural';
import type { recurring as en } from '../en/recurring';

const plural = createPlural('it');

export const recurring: typeof en = {
  title: 'Ricorrenti',
  createRecurring: 'Crea movimento ricorrente',
  closeRecurring: 'Chiudi movimenti ricorrenti',
  sections: 'Sezioni dei ricorrenti',
  tabDue: 'Da registrare',
  tabRules: 'Regole',
  tabHistory: 'Cronologia',
  updating: 'Aggiornamento…',
  backlogLimited: 'Un grande arretrato è stato limitato per questo caricamento. Riapri questa schermata per continuare in sicurezza.',
  loadError: 'Impossibile caricare i movimenti ricorrenti.',

  noneDue: 'Nessun movimento ricorrente da registrare oggi.',
  dueOn: (date: string) => `Da registrare: ${date}`,
  confirmOccurrence: (label: string) => `Conferma ${label}`,
  editOccurrence: (label: string) => `Modifica l’occorrenza ${label}`,
  skipOccurrence: (label: string) => `Salta l’occorrenza ${label}`,
  skip: 'Salta',
  skipTitle: 'Saltare questa occorrenza?',
  skipMessage: 'Resterà nella cronologia dei ricorrenti e non influirà su saldi o report.',
  unableToConfirm: 'Impossibile confermare',
  confirmFallback: 'Controlla l’occorrenza e riprova.',
  unableToSkip: 'Impossibile saltare',
  tryAgain: 'Riprova.',

  activeRules: 'Regole attive',
  pausedRules: 'Regole in pausa',
  endedRules: 'Regole terminate',
  sectionCount: (title: string, count: number) => `${title} · ${count}`,
  createRule: 'Crea regola',
  createFirstRule: 'Crea la tua prima regola ricorrente',
  emptyTitle: 'Ancora nessuna regola ricorrente',
  emptyBody: 'Crea una regola per uscite, entrate o trasferimenti che prevedi con regolarità.',
  noActiveRules: 'Nessuna regola attiva al momento. Le regole in pausa e terminate sono elencate sotto.',
  ruleStatus: {
    active: 'Attiva',
    paused: 'In pausa',
    ended: 'Terminata',
  },
  ruleStatusAccessibility: (status: string) => `Stato della regola: ${status}`,
  nextOn: (date: string) => `Prossima: ${date}`,
  editFuture: 'Modifica future',
  pause: 'Metti in pausa',
  resume: 'Riprendi',
  end: 'Termina',
  endTitle: 'Terminare il movimento ricorrente?',
  endMessage: 'Non verranno generate altre occorrenze. La cronologia e gli elementi da registrare restano.',
  unableToUpdateRule: 'Impossibile aggiornare la regola',
  unableToEndRule: 'Impossibile terminare la regola',
  account: 'Conto',
  category: 'Categoria',

  frequency: {
    daily: 'Giornaliera',
    weekly: 'Settimanale',
    monthly: 'Mensile',
    yearly: 'Annuale',
  },
  everyTwoWeeks: 'Ogni due settimane',
  everyInterval: (count, unit) => {
    if (unit === 'daily') return `Ogni ${count} ${plural(count, 'giorno', 'giorni')}`;
    if (unit === 'weekly') return `Ogni ${count} ${plural(count, 'settimana', 'settimane')}`;
    if (unit === 'monthly') return `Ogni ${count} ${plural(count, 'mese', 'mesi')}`;
    return `Ogni ${count} ${plural(count, 'anno', 'anni')}`;
  },

  historyEmpty: 'Le occorrenze confermate e saltate appariranno qui.',
  occurrenceStatus: {
    posted: 'Registrata',
    skipped: 'Saltata',
  },
  occurrenceStatusSpoken: {
    pending: 'da registrare',
    posted: 'registrata',
    skipped: 'saltata',
  },
  historyAccessibility: (status: string, label: string, amount: string, date: string) =>
    `${status}, ${label}, ${amount}, ${date}`,

  createTitle: 'Crea movimento ricorrente',
  editRuleTitle: 'Modifica regola futura',
  editOccurrenceTitle: 'Modifica questa occorrenza',
  optionDaily: 'Giornaliera',
  optionWeekly: 'Settimanale',
  optionEveryTwoWeeks: 'Ogni 2 settimane',
  optionMonthly: 'Mensile',
  optionYearly: 'Annuale',
  frequencyLabel: 'Frequenza',
  sourceAccount: 'Conto di origine',
  destinationAccount: 'Conto di destinazione',
  selectAccount: 'Seleziona conto',
  selectSourceAccount: 'Seleziona conto di origine',
  selectDestinationAccount: 'Seleziona conto di destinazione',
  selectIncomeCategory: 'Seleziona categoria di entrata',
  selectExpenseCategory: 'Seleziona categoria di uscita',
  startDate: 'Data di inizio',
  scheduledDate: 'Data prevista',
  endDateOptional: 'Data di fine (facoltativa)',
  noteOptional: 'Nota (facoltativa)',
  noteAccessibility: 'Nota del movimento ricorrente',
  notePlaceholder: 'Aggiungi una descrizione…',
  saveRecurring: 'Salva movimento ricorrente',
  saveError: 'Impossibile salvare il movimento ricorrente.',
  errorAmount: 'Inserisci un importo valido maggiore di zero.',

  ruleLoadError: 'Impossibile caricare il movimento ricorrente.',
  occurrenceLoadError: 'Impossibile caricare l’occorrenza.',

  ruleNotFound: 'Movimento ricorrente non trovato.',
  occurrenceNotFound: 'Occorrenza ricorrente non trovata.',
  alreadyHandled: 'Questa occorrenza ricorrente è già stata gestita.',
  endedCannotEdit: 'I movimenti ricorrenti terminati non possono essere modificati.',
  endedCannotResume: 'I movimenti ricorrenti terminati non possono riprendere.',
  hasEnded: 'Questo movimento ricorrente è terminato.',
  missingExchangeRate: (currency: string, baseCurrency: string) =>
    `Aggiungi un tasso di cambio ${currency}/${baseCurrency} prima di registrare questo movimento.`,
  errorDateFormat: 'Inserisci una data valida nel formato AAAA-MM-GG.',
  errorFrequency: 'Seleziona una frequenza supportata.',
  errorInterval: 'L’intervallo deve essere un numero intero positivo.',
  errorStartDate: 'Inserisci una data di inizio valida.',
  errorEndDate: 'Inserisci una data di fine valida.',
  errorEndBeforeStart: 'La data di fine non può precedere la data di inizio.',
  errorCrossCurrencyTransfer: 'I trasferimenti ricorrenti tra valute diverse non sono supportati.',
};
