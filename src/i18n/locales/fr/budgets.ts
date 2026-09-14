import { createPlural } from '../../plural';
import type { budgets as en } from '../en/budgets';

const plural = createPlural('fr');

export const budgets: typeof en = {
  createBudget: 'Créer un budget',
  selectedMonth: (month: string) => `Mois sélectionné, ${month}`,
  monthlyBudgets: 'Budgets du mois',
  monthlyCategoryBudgets: 'Budgets par catégorie du mois',

  status: {
    'on-track': 'Maîtrisé',
    'near-limit': 'Limite proche',
    'fully-used': 'Épuisé',
    'over-budget': 'Dépassé',
  },

  spent: 'Dépensé',
  remaining: 'Restant',
  overBy: 'Dépassé de',
  spentOfLimit: (spent: string, limit: string) => `${spent} sur ${limit}`,
  percentUsed: (percentage: number) => `${percentage} % utilisé`,
  subLimit: 'Sous-limite',
  monthlyTag: 'Mensuel',
  inParent: (parent: string) => `dans ${parent}`,
  archivedCategory: 'Catégorie archivée',
  cardHint: 'Ouvre la modification du budget',
  cardAccessibility: (value) =>
    `${value.category}${value.archived ? ', catégorie archivée' : ''}, ${value.status}, ${value.spent} dépensés sur ${value.limit}, ${value.over ? 'dépassé de' : 'restant'} ${value.remaining}, ${value.percentage} % utilisé`,
  progressAccessibility: (status: string, percentage: number) => `${status}, ${percentage} % utilisé`,

  totalMonthlyBudget: 'Budget mensuel total',
  summaryAccessibility: (total: string, spent: string, remaining: string, percentage: number) =>
    `Budget mensuel total ${total}, dépensé ${spent}, restant ${remaining}, ${percentage} % utilisé`,
  overallProgress: 'Progression globale',
  nestedNote: (count: number) =>
    plural(
      count,
      `${count} sous-limite est comptée dans sa catégorie, sans s’ajouter au total.`,
      `${count} sous-limites sont comptées dans leurs catégories, sans s’ajouter au total.`,
    ),

  emptyTitle: 'Aucun budget ce mois-ci',
  emptyBody: 'Créez un budget par catégorie pour commencer à planifier vos dépenses du mois.',
  createFirstBudget: 'Créer le premier budget',
  loadingBudgets: 'Chargement des budgets',
  retryLoading: 'Réessayer de charger les budgets',
  loadBudgetsError: 'Impossible de charger les budgets.',

  expenseCategory: 'Catégorie de dépense',
  searchExpenseCategories: 'Rechercher des catégories de dépense',
  searchCategories: 'Rechercher des catégories',
  categoryOption: (name: string, archived: boolean) => `${name}${archived ? ', archivée' : ''}`,
  archived: 'Archivée',
  noMatchingCategories: 'Aucune catégorie de dépense active ne correspond.',

  budgetColor: 'Couleur du budget',
  colors: {
    blue: 'Bleu',
    teal: 'Bleu canard',
    green: 'Vert',
    amber: 'Ambre',
    coral: 'Corail',
    pink: 'Rose',
    purple: 'Violet',
    indigo: 'Indigo',
  },

  closeForm: 'Fermer le formulaire du budget',
  editTitle: 'Modifier le budget',
  createTitle: 'Créer un budget',
  category: 'Catégorie',
  budgetMonth: 'Mois du budget',
  budgetMonthInput: 'Mois du budget au format AAAA-MM',
  monthPlaceholder: 'AAAA-MM',
  budgetLimit: 'Limite du budget',
  repeatTitle: 'Répéter chaque mois',
  repeatHint: 'Revient automatiquement chaque mois. Un changement de montant s’applique à partir de ce mois.',
  repeatAccessibility: 'Répéter ce budget chaque mois',
  removeBudget: 'Supprimer le budget',
  removeTitle: 'Supprimer le budget ?',
  removeRecurringMessage:
    'Le budget récurrent s’arrête et est retiré de ce mois et des mois suivants. Les mois passés sont conservés. Les catégories et les transactions ne sont pas supprimées.',
  removeOneOffMessage: 'Seul le plan de ce mois est retiré. Les catégories et les transactions ne sont pas supprimées.',
  saveBudgetChanges: 'Enregistrer les modifications du budget',
  saveChanges: 'Enregistrer',
  loadError: 'Impossible de charger le budget.',
  saveError: 'Impossible d’enregistrer le budget.',
  removeError: 'Impossible de supprimer le budget.',
  notFound: 'Budget introuvable.',

  errorSelectExpenseCategory: 'Sélectionnez une catégorie de dépense.',
  errorSelectExistingCategory: 'Sélectionnez une catégorie de dépense existante.',
  errorSelectActiveCategory: 'Sélectionnez une catégorie de dépense active.',
  errorInvalidMonth: 'Saisissez un mois valide au format AAAA-MM.',
  errorLimitRange: 'Saisissez une limite positive dans la plage autorisée.',
  errorInvalidColor: 'Sélectionnez une couleur de budget valide.',
  errorRecurringExists: 'Cette catégorie a déjà un budget récurrent.',
  errorDuplicate: 'Cette catégorie a déjà un budget pour le mois sélectionné.',
  errorCeilingLimit: 'Saisissez une limite entière positive.',

  monthlyCeiling: 'Plafond mensuel',
  ceilingAccessibility: (limit: string, spent: string, over: boolean, remaining: string, percentage: number) =>
    `Plafond mensuel ${limit}, dépensé ${spent}, ${over ? 'dépassé de' : 'restant'} ${remaining}, ${percentage} % utilisé`,
  carriedForward: (month: string) => `Reporté depuis ${month}.`,
  spentThisMonth: 'Dépensé ce mois-ci',
  allSpending: 'Toutes les dépenses',
  ceilingOverAllocated: (total: string, excess: string) =>
    `Les budgets par catégorie totalisent ${total}, soit ${excess} au-dessus de ce plafond.`,
  ceilingUnallocated: (total: string, unallocated: string) =>
    `${total} est prévu dans les budgets par catégorie ; ${unallocated} de ce plafond n’est pas budgété.`,
  ceilingEmptyBody:
    'Fixez une limite globale pour le mois. Chaque dépense compte, y compris celles qu’aucun budget par catégorie ne couvre.',
  setMonthlyCeiling: 'Fixer un plafond mensuel',

  closeCeilingForm: 'Fermer le formulaire du plafond mensuel',
  ceilingFor: (month: string) => `Plafond pour ${month}`,
  ceilingHelpCounts:
    'Chaque dépense enregistrée compte, remboursements déduits, y compris celles qu’aucun budget par catégorie ne couvre. Les virements et les versements sur des placements ne comptent pas.',
  ceilingHelpApplies: (month: string) =>
    `Il s’applique à partir de ${month} jusqu’à ce que vous le modifiiez. Un mois ultérieur fixé séparément garde son propre plafond.`,
  removeCeiling: 'Supprimer le plafond',
  saveCeiling: 'Enregistrer',
  setCeiling: 'Fixer le plafond',
  remove: 'Supprimer',
  removeCeilingTitle: 'Supprimer le plafond mensuel ?',
  removeCeilingMessage: (month: string) =>
    `Aucun plafond ne s’appliquera à partir de ${month}. Les mois précédents gardent le leur et aucun budget par catégorie n’est modifié.`,
  ceilingEnterPositive: 'Saisissez un montant positif.',
  ceilingLoadError: 'Impossible de charger le plafond mensuel.',
  ceilingSaveError: 'Impossible d’enregistrer le plafond mensuel.',
  ceilingRemoveError: 'Impossible de supprimer le plafond mensuel.',
};
