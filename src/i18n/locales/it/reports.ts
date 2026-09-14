import type { reports as en } from '../en/reports';
import { createPlural } from '../../plural';

const plural = createPlural('it');

/** "la domenica" is feminine; every other weekday is masculine ("il lunedì"). */
const weekdayArticle = (weekday: number) => (weekday === 0 ? 'La' : 'Il');

export const reports: typeof en = {
  title: 'Report',
  headerSubtitle: 'Il tuo storico finanziario salvato',
  backFromReports: 'Indietro da Report',
  loadingReports: 'Caricamento dei report',
  loadErrorTitle: 'Impossibile caricare i report',
  loadError: 'Impossibile caricare i report.',
  budgetsLoadError: 'Impossibile caricare i budget di questo periodo.',
  updating: 'Aggiornamento di tutte le sezioni del report…',

  presetCurrentMonth: 'Mese corrente',
  presetPreviousMonth: 'Mese precedente',
  presetLast3Months: 'Ultimi 3 mesi',
  presetLast6Months: 'Ultimi 6 mesi',
  presetCurrentYear: 'Anno corrente',
  presetCustom: 'Personalizzato',
  startDate: 'Data di inizio',
  endDate: 'Data di fine',
  applyRange: 'Applica',
  applyRangeLabel: 'Applica il periodo personalizzato del report',
  invalidPeriod: 'Periodo del report non valido.',
  selectedPeriod: (label) => `Periodo del report selezionato, ${label}`,

  invalidToday: 'Impossibile determinare una data locale valida per Bogotá.',
  invalidCustomDates: 'Inserisci date di inizio e fine valide nel formato AAAA-MM-GG.',
  endBeforeStart: 'La data di fine non può precedere la data di inizio.',

  netWorthStart: 'Inizio',
  unknownCategory: 'Categoria sconosciuta',
  noSubcategory: 'Senza sottocategoria',

  emptyTitle: 'Nessuna entrata o uscita registrata',
  emptyDescription:
    'I totali restano a zero per questo periodo. Trasferimenti, movimenti annullati e ricorrenze da registrare o saltate non vengono conteggiati.',

  summaryTitle: 'Riepilogo del periodo',
  summaryDescription: 'Entrate e uscite registrate nel periodo selezionato.',
  netResult: 'Risultato netto',
  income: 'Entrate',
  expenses: 'Uscite',
  net: 'Netto',
  netExpenses: 'Uscite nette',
  grossExpenses: 'Uscite lorde',
  refunds: 'Rimborsi',
  averageExpense: 'Uscita media',
  expenseTransactions: 'Movimenti di uscita',
  incomeTransactions: 'Movimenti di entrata',
  refundTransactions: 'Movimenti di rimborso',
  largestExpense: 'Uscita più alta',
  noLargestExpense: 'Nessuna uscita registrata in questo periodo.',
  savingsRateNotApplicable: 'Nessuna entrata in questo periodo, quindi il tasso di risparmio non si applica.',
  savingsRate: (percentage) => `Hai messo da parte il ${percentage} di quanto hai guadagnato.`,
  showDetails: 'Mostra dettagli',
  hideDetails: 'Nascondi dettagli',
  showSummaryDetails: 'Mostra i dettagli del riepilogo',
  hideSummaryDetails: 'Nascondi i dettagli del riepilogo',

  cashFlowTitle: 'Entrate e uscite',
  cashFlowDescriptionDay:
    'Una colonna per giorno (ora di Bogotá). Le entrate salgono sopra la linea, le uscite scendono sotto.',
  cashFlowDescriptionMonth:
    'Una colonna per mese. Le entrate salgono sopra la linea, le uscite scendono sotto.',
  wholePeriod: 'Intero periodo',
  cashFlowChartLabel: (income, expenses) =>
    `Grafico del flusso di cassa. Entrate totali ${income}. Uscite totali ${expenses}.`,
  cashFlowHint: 'Tocca una colonna per vederne il dettaglio.',
  cashFlowHintSelected: 'Tocca di nuovo la colonna per vedere l’intero periodo.',

  paceTitle: 'Ritmo di spesa',
  paceDescription: (previousPeriod) =>
    `Totale progressivo delle uscite nette, rispetto allo stesso punto del periodo precedente (${previousPeriod}).`,
  previousPeriod: 'Periodo precedente',
  thisPeriod: 'Questo periodo',
  spentSoFar: 'Speso finora',
  versusLast: (signedAmount) => `${signedAmount} vs precedente`,
  paceChartLabel: (spent, previousAmount, previousPeriod) =>
    `Spesa cumulativa. ${spent} finora, contro ${previousAmount} allo stesso punto (${previousPeriod}).`,

  budgetTitle: 'Budget e speso',
  budgetDescription:
    'Budget per categoria rispetto a quanto speso davvero. La spesa è già al netto dei rimborsi ed esclude i trasferimenti.',
  budgetSumHint: (monthCount) =>
    `I limiti sono la somma di ${monthCount} budget mensili; i budget non vengono mai ripartiti pro rata.`,
  budgetRowLabel: (category, spent, limit, percentage) =>
    `${category}, ${spent} spesi su ${limit}, ${percentage}% usato`,
  spentOfLimit: (spent, limit) => `${spent} su ${limit}`,
  remaining: (amount) => `${amount} rimanenti`,
  over: (amount) => `${amount} oltre`,

  weekdayTitle: 'Spesa per giorno della settimana',
  weekdayDescription:
    'Uscite nette medie per giorno della settimana, divise per quante volte quel giorno compare nel periodo.',
  weekdayColumnLabel: (shortDay, longDay, average, dayCount) =>
    `${longDay}, media ${average} su ${dayCount} ${plural(dayCount, 'giorno', 'giorni')}`,
  heaviestDay: (shortDay, longDay, weekday, amount) =>
    `${weekdayArticle(weekday)} ${longDay} è il giorno in cui spendi di più: ${amount} in media.`,
  noWeekdayExpenses: 'Nessuna uscita da confrontare tra i giorni della settimana.',

  categoryTitle: 'Uscite per categoria',
  categoryDescription:
    'Tutte le uscite registrate, ordinate per ID fisso della categoria, incluse le categorie archiviate.',
  categoryEmpty: 'Nessuna uscita registrata da ordinare in questo periodo.',
  donutLabel: (total) => `Uscite per categoria. Totale ${total}.`,
  totalExpenses: 'Uscite totali',
  otherCategories: (count) => `Altre (${count})`,
  expensesRanked: 'Uscite ordinate per categoria',
  transactionCount: (count) => `${count} ${plural(count, 'movimento', 'movimenti')}`,
  inDetail: (count) => `${count} in dettaglio`,
  shareOfCategory: (percentage, category) => `${percentage} di ${category}`,
  showBreakdownHint: 'Mostra la ripartizione per sottocategoria',
  hideBreakdownHint: 'Nasconde la ripartizione per sottocategoria',

  netWorthTitle: 'Andamento del patrimonio netto',
  netWorthDescriptionDay: (date) =>
    `Parte dal patrimonio netto prima del ${date}, poi applica lo storico registrato fino a ogni giorno.`,
  netWorthDescriptionMonth: (date) =>
    `Parte dal patrimonio netto prima del ${date}, poi applica lo storico registrato fino a ogni fine mese.`,
  noNetWorthHistory: 'Nessuno storico del patrimonio netto per questo periodo.',
  endingNetWorth: 'Patrimonio netto finale',
  netWorthChartLabel: (start, end) =>
    `Andamento del patrimonio netto. Parte da ${start} e arriva a ${end}.`,

  investmentsTitle: 'Investimenti',
  investmentsDescription:
    'Posizione attuale degli investimenti (stimata) più le entrate da investimenti realizzate nel periodo. Le variazioni di valutazione non realizzate aumentano il patrimonio netto, ma non contano mai come entrata ordinaria.',
  currentValue: 'Valore attuale',
  estimatedIncomplete: 'Stimato — incompleto',
  netContributions: 'Versamenti netti',
  estimatedGainLoss: 'Guadagno/perdita stimato',
  simpleEstimatedReturn: 'Rendimento semplice stimato',
  investmentIncomePeriod: 'Entrate da investimenti (periodo)',

  comparisonTitle: 'Confronto con il periodo precedente',
  comparisonDescription: (previousPeriod) =>
    `Confronto con il periodo precedente (${previousPeriod}). Un aumento delle uscite è segnalato come negativo.`,
  noChange: 'Nessuna variazione',
  noPreviousData: 'Nessun dato del periodo precedente',
  percentageUnavailable: 'percentuale non disponibile',
  increasedBy: (difference, percentage) => `Aumentato di ${difference} (${percentage})`,
  decreasedBy: (difference, percentage) => `Diminuito di ${difference} (${percentage})`,
  comparisonRowLabel: (label, current, change) => `${label}. Attuale ${current}. ${change}.`,
};
