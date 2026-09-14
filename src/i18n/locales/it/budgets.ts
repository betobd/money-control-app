import { createPlural } from '../../plural';
import type { budgets as en } from '../en/budgets';

const plural = createPlural('it');

export const budgets: typeof en = {
  createBudget: 'Crea budget',
  selectedMonth: (month: string) => `Mese selezionato, ${month}`,
  monthlyBudgets: 'Budget del mese',
  monthlyCategoryBudgets: 'Budget per categoria del mese',

  status: {
    'on-track': 'In linea',
    'near-limit': 'Quasi esaurito',
    'fully-used': 'Esaurito',
    'over-budget': 'Superato',
  },

  spent: 'Speso',
  remaining: 'Disponibile',
  overBy: 'Superato di',
  spentOfLimit: (spent: string, limit: string) => `${spent} su ${limit}`,
  percentUsed: (percentage: number) => `${percentage}% usato`,
  subLimit: 'Sottolimite',
  monthlyTag: 'Mensile',
  inParent: (parent: string) => `in ${parent}`,
  archivedCategory: 'Categoria archiviata',
  cardHint: 'Apre la modifica del budget',
  cardAccessibility: (value) =>
    `${value.category}${value.archived ? ', categoria archiviata' : ''}, ${value.status}, speso ${value.spent} su ${value.limit}, ${value.over ? 'superato di' : 'disponibile'} ${value.remaining}, ${value.percentage}% usato`,
  progressAccessibility: (status: string, percentage: number) => `${status}, ${percentage}% usato`,

  totalMonthlyBudget: 'Budget mensile totale',
  summaryAccessibility: (total: string, spent: string, remaining: string, percentage: number) =>
    `Budget mensile totale ${total}, speso ${spent}, disponibile ${remaining}, ${percentage}% usato`,
  overallProgress: 'Avanzamento complessivo',
  nestedNote: (count: number) =>
    plural(
      count,
      `${count} sottolimite è conteggiato nella sua categoria, non si somma al totale.`,
      `${count} sottolimiti sono conteggiati nelle loro categorie, non si sommano al totale.`,
    ),

  emptyTitle: 'Nessun budget per questo mese',
  emptyBody: 'Crea un budget per categoria per iniziare a pianificare le spese del mese.',
  createFirstBudget: 'Crea il primo budget',
  loadingBudgets: 'Caricamento dei budget',
  retryLoading: 'Riprova a caricare i budget',
  loadBudgetsError: 'Impossibile caricare i budget.',

  expenseCategory: 'Categoria di uscita',
  searchExpenseCategories: 'Cerca categorie di uscita',
  searchCategories: 'Cerca categorie',
  categoryOption: (name: string, archived: boolean) => `${name}${archived ? ', archiviata' : ''}`,
  archived: 'Archiviata',
  noMatchingCategories: 'Nessuna categoria di uscita attiva corrispondente.',

  budgetColor: 'Colore del budget',
  colors: {
    blue: 'Blu',
    teal: 'Verde acqua',
    green: 'Verde',
    amber: 'Ambra',
    coral: 'Corallo',
    pink: 'Rosa',
    purple: 'Viola',
    indigo: 'Indaco',
  },

  closeForm: 'Chiudi il modulo del budget',
  editTitle: 'Modifica budget',
  createTitle: 'Crea budget',
  category: 'Categoria',
  budgetMonth: 'Mese del budget',
  budgetMonthInput: 'Mese del budget nel formato AAAA-MM',
  monthPlaceholder: 'AAAA-MM',
  budgetLimit: 'Limite del budget',
  repeatTitle: 'Ripeti ogni mese',
  repeatHint: 'Si ripresenta automaticamente ogni mese. Modificare l’importo vale da questo mese in poi.',
  repeatAccessibility: 'Ripeti questo budget ogni mese',
  removeBudget: 'Rimuovi budget',
  removeTitle: 'Rimuovere il budget?',
  removeRecurringMessage:
    'Il budget ricorrente si interrompe e viene rimosso da questo mese e da quelli successivi. I mesi passati restano. Categorie e movimenti non vengono eliminati.',
  removeOneOffMessage: 'Viene rimosso solo il piano di questo mese. Categorie e movimenti non vengono eliminati.',
  saveBudgetChanges: 'Salva le modifiche al budget',
  saveChanges: 'Salva modifiche',
  loadError: 'Impossibile caricare il budget.',
  saveError: 'Impossibile salvare il budget.',
  removeError: 'Impossibile rimuovere il budget.',
  notFound: 'Budget non trovato.',

  errorSelectExpenseCategory: 'Seleziona una categoria di uscita.',
  errorSelectExistingCategory: 'Seleziona una categoria di uscita esistente.',
  errorSelectActiveCategory: 'Seleziona una categoria di uscita attiva.',
  errorInvalidMonth: 'Inserisci un mese valido nel formato AAAA-MM.',
  errorLimitRange: 'Inserisci un limite positivo entro l’intervallo supportato.',
  errorInvalidColor: 'Seleziona un colore del budget valido.',
  errorRecurringExists: 'Questa categoria ha già un budget ricorrente.',
  errorDuplicate: 'Questa categoria ha già un budget per il mese selezionato.',
  errorCeilingLimit: 'Inserisci un limite intero positivo.',

  monthlyCeiling: 'Tetto mensile',
  ceilingAccessibility: (limit: string, spent: string, over: boolean, remaining: string, percentage: number) =>
    `Tetto mensile ${limit}, speso ${spent}, ${over ? 'superato di' : 'disponibile'} ${remaining}, ${percentage}% usato`,
  carriedForward: (month: string) => `Riportato da ${month}.`,
  spentThisMonth: 'Speso questo mese',
  allSpending: 'Tutte le uscite',
  ceilingOverAllocated: (total: string, excess: string) =>
    `I budget per categoria arrivano a ${total}, cioè ${excess} oltre questo tetto.`,
  ceilingUnallocated: (total: string, unallocated: string) =>
    `${total} è pianificato nei budget per categoria; ${unallocated} di questo tetto non è assegnato.`,
  ceilingEmptyBody:
    'Imposta un limite complessivo per il mese. Ogni uscita conta, comprese quelle che nessun budget per categoria copre.',
  setMonthlyCeiling: 'Imposta tetto mensile',

  closeCeilingForm: 'Chiudi il modulo del tetto mensile',
  ceilingFor: (month: string) => `Tetto per ${month}`,
  ceilingHelpCounts:
    'Ogni uscita registrata conta, al netto dei rimborsi, comprese le spese che nessun budget per categoria copre. Trasferimenti e versamenti negli investimenti non contano.',
  ceilingHelpApplies: (month: string) =>
    `Vale da ${month} in poi finché non lo modifichi. Un mese successivo impostato a parte mantiene il proprio tetto.`,
  removeCeiling: 'Rimuovi tetto',
  saveCeiling: 'Salva tetto',
  setCeiling: 'Imposta tetto',
  remove: 'Rimuovi',
  removeCeilingTitle: 'Rimuovere il tetto mensile?',
  removeCeilingMessage: (month: string) =>
    `Da ${month} in poi non si applicherà alcun tetto. I mesi precedenti mantengono il loro e nessun budget per categoria viene modificato.`,
  ceilingEnterPositive: 'Inserisci un importo positivo.',
  ceilingLoadError: 'Impossibile caricare il tetto mensile.',
  ceilingSaveError: 'Impossibile salvare il tetto mensile.',
  ceilingRemoveError: 'Impossibile rimuovere il tetto mensile.',
};
