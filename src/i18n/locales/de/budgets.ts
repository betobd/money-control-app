import { createPlural } from '../../plural';
import type { budgets as en } from '../en/budgets';

const plural = createPlural('de');

export const budgets: typeof en = {
  createBudget: 'Budget erstellen',
  selectedMonth: (month: string) => `Ausgewählter Monat, ${month}`,
  monthlyBudgets: 'Monatsbudgets',
  monthlyCategoryBudgets: 'Monatliche Kategoriebudgets',

  status: {
    'on-track': 'Im Rahmen',
    'near-limit': 'Fast erreicht',
    'fully-used': 'Ausgeschöpft',
    'over-budget': 'Überzogen',
  },

  spent: 'Ausgegeben',
  remaining: 'Verfügbar',
  overBy: 'Überzogen um',
  spentOfLimit: (spent: string, limit: string) => `${spent} von ${limit}`,
  percentUsed: (percentage: number) => `${percentage} % genutzt`,
  subLimit: 'Teillimit',
  monthlyTag: 'Monatlich',
  inParent: (parent: string) => `in ${parent}`,
  archivedCategory: 'Archivierte Kategorie',
  cardHint: 'Öffnet die Budgetbearbeitung',
  cardAccessibility: (value) =>
    `${value.category}${value.archived ? ', archivierte Kategorie' : ''}, ${value.status}, ${value.spent} von ${value.limit} ausgegeben, ${value.over ? 'überzogen um' : 'verfügbar'} ${value.remaining}, ${value.percentage} % genutzt`,
  progressAccessibility: (status: string, percentage: number) => `${status}, ${percentage} % genutzt`,

  totalMonthlyBudget: 'Monatsbudget gesamt',
  summaryAccessibility: (total: string, spent: string, remaining: string, percentage: number) =>
    `Monatsbudget gesamt ${total}, ausgegeben ${spent}, verfügbar ${remaining}, ${percentage} % genutzt`,
  overallProgress: 'Gesamtfortschritt',
  nestedNote: (count: number) =>
    plural(
      count,
      `${count} Teillimit wird innerhalb seiner Kategorie gezählt, nicht zusätzlich zur Summe.`,
      `${count} Teillimits werden innerhalb ihrer Kategorien gezählt, nicht zusätzlich zur Summe.`,
    ),

  emptyTitle: 'Keine Budgets in diesem Monat',
  emptyBody: 'Erstelle ein Kategoriebudget, um deine monatlichen Ausgaben zu planen.',
  createFirstBudget: 'Erstes Budget erstellen',
  loadingBudgets: 'Budgets werden geladen',
  retryLoading: 'Budgets erneut laden',
  loadBudgetsError: 'Budgets konnten nicht geladen werden.',

  expenseCategory: 'Ausgabenkategorie',
  searchExpenseCategories: 'Ausgabenkategorien durchsuchen',
  searchCategories: 'Kategorien suchen',
  categoryOption: (name: string, archived: boolean) => `${name}${archived ? ', archiviert' : ''}`,
  archived: 'Archiviert',
  noMatchingCategories: 'Keine passenden aktiven Ausgabenkategorien.',

  budgetColor: 'Budgetfarbe',
  colors: {
    blue: 'Blau',
    teal: 'Petrol',
    green: 'Grün',
    amber: 'Bernstein',
    coral: 'Koralle',
    pink: 'Rosa',
    purple: 'Lila',
    indigo: 'Indigo',
  },

  closeForm: 'Budgetformular schließen',
  editTitle: 'Budget bearbeiten',
  createTitle: 'Budget erstellen',
  category: 'Kategorie',
  budgetMonth: 'Budgetmonat',
  budgetMonthInput: 'Budgetmonat im Format JJJJ-MM',
  monthPlaceholder: 'JJJJ-MM',
  budgetLimit: 'Budgetlimit',
  repeatTitle: 'Jeden Monat wiederholen',
  repeatHint: 'Erscheint jeden Monat automatisch. Eine Betragsänderung gilt ab diesem Monat.',
  repeatAccessibility: 'Dieses Budget jeden Monat wiederholen',
  removeBudget: 'Budget entfernen',
  removeTitle: 'Budget entfernen?',
  removeRecurringMessage:
    'Das wiederkehrende Budget endet und wird aus diesem und allen folgenden Monaten entfernt. Vergangene Monate bleiben erhalten. Kategorien und Buchungen werden nicht gelöscht.',
  removeOneOffMessage: 'Nur der Plan für diesen Monat wird entfernt. Kategorien und Buchungen werden nicht gelöscht.',
  saveBudgetChanges: 'Budgetänderungen speichern',
  saveChanges: 'Änderungen speichern',
  loadError: 'Budget konnte nicht geladen werden.',
  saveError: 'Budget konnte nicht gespeichert werden.',
  removeError: 'Budget konnte nicht entfernt werden.',
  notFound: 'Budget nicht gefunden.',

  errorSelectExpenseCategory: 'Wähle eine Ausgabenkategorie.',
  errorSelectExistingCategory: 'Wähle eine vorhandene Ausgabenkategorie.',
  errorSelectActiveCategory: 'Wähle eine aktive Ausgabenkategorie.',
  errorInvalidMonth: 'Gib einen gültigen Monat im Format JJJJ-MM ein.',
  errorLimitRange: 'Gib ein positives Limit im unterstützten Bereich ein.',
  errorInvalidColor: 'Wähle eine gültige Budgetfarbe.',
  errorRecurringExists: 'Diese Kategorie hat bereits ein wiederkehrendes Budget.',
  errorDuplicate: 'Diese Kategorie hat für den gewählten Monat bereits ein Budget.',
  errorCeilingLimit: 'Gib ein positives, ganzzahliges Limit ein.',

  monthlyCeiling: 'Monatslimit',
  ceilingAccessibility: (limit: string, spent: string, over: boolean, remaining: string, percentage: number) =>
    `Monatslimit ${limit}, ausgegeben ${spent}, ${over ? 'überzogen um' : 'verfügbar'} ${remaining}, ${percentage} % genutzt`,
  carriedForward: (month: string) => `Übernommen aus ${month}.`,
  spentThisMonth: 'Diesen Monat ausgegeben',
  allSpending: 'Alle Ausgaben',
  ceilingOverAllocated: (total: string, excess: string) =>
    `Die Kategoriebudgets ergeben zusammen ${total} und liegen damit ${excess} über diesem Limit.`,
  ceilingUnallocated: (total: string, unallocated: string) =>
    `${total} sind in Kategoriebudgets verplant; ${unallocated} dieses Limits sind keinem Budget zugeordnet.`,
  ceilingEmptyBody:
    'Lege ein Gesamtlimit für den Monat fest. Jede Ausgabe zählt dazu, auch die, die kein Kategoriebudget abdeckt.',
  setMonthlyCeiling: 'Monatslimit festlegen',

  closeCeilingForm: 'Monatslimit-Formular schließen',
  ceilingFor: (month: string) => `Limit für ${month}`,
  ceilingHelpCounts:
    'Jede gebuchte Ausgabe zählt, abzüglich Erstattungen – auch Ausgaben, die kein Kategoriebudget abdeckt. Umbuchungen und Einzahlungen in Geldanlagen zählen nicht.',
  ceilingHelpApplies: (month: string) =>
    `Es gilt ab ${month}, bis du es änderst. Ein späterer Monat, den du eigens festlegst, behält sein eigenes Limit.`,
  removeCeiling: 'Limit entfernen',
  saveCeiling: 'Limit speichern',
  setCeiling: 'Limit festlegen',
  remove: 'Entfernen',
  removeCeilingTitle: 'Monatslimit entfernen?',
  removeCeilingMessage: (month: string) =>
    `Ab ${month} gilt kein Limit mehr. Frühere Monate behalten ihres, und kein Kategoriebudget ist betroffen.`,
  ceilingEnterPositive: 'Gib einen positiven Betrag ein.',
  ceilingLoadError: 'Monatslimit konnte nicht geladen werden.',
  ceilingSaveError: 'Monatslimit konnte nicht gespeichert werden.',
  ceilingRemoveError: 'Monatslimit konnte nicht entfernt werden.',
};
