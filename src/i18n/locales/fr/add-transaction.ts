import type { addTransaction as en } from '../en/add-transaction';
import { createPlural } from '../../plural';

const plural = createPlural('fr');

export const addTransaction: typeof en = {
  title: 'Ajouter une transaction',
  close: 'Fermer Ajouter une transaction',
  unableToSave: 'Impossible d’enregistrer la transaction.',
  missingPairRate: (currency: string, base: string) =>
    `Ajoutez un taux de change ${currency}/${base} avant d’enregistrer cette transaction.`,
  referenceRate: (rate: string, date: string) =>
    `Taux de référence ${rate} · date du taux ${date}. Votre banque peut appliquer un autre taux.`,
  noRate: (currency: string, base: string) =>
    `Aucun taux de change disponible. Ajoutez un taux ${currency}/${base} dans Plus → Devise et taux avant d’enregistrer.`,
  transferReducesDebt: 'Ce virement réduit la dette actuelle de la carte.',
  transferIncreasesDebt: 'Cela augmente la dette actuelle de la carte ou réduit un solde créditeur.',
  selectAccount: 'Choisir un compte',
  selectSourceAccount: 'Choisir le compte source',
  selectDestinationAccount: 'Choisir le compte de destination',
  selectCategory: 'Choisir une catégorie',
  selectExpenseCategory: 'Choisir une catégorie de dépense',
  selectIncomeCategory: 'Choisir une catégorie de revenu',
  amountReceived: (currency: string) => `Montant reçu (${currency})`,
  amountReceivedA11y: (currency: string) => `Montant reçu en ${currency}`,
  estimateFromRate: 'Estimer avec le taux de référence',
  amountReceivedHelp: 'Saisissez le montant réellement crédité par votre banque. Les deux montants sont enregistrés.',
  manageCategories: 'Gérer les catégories',
  sourceAccount: 'Compte source',
  destinationAccount: 'Compte de destination',
  fromAccount: 'Compte source',
  toAccount: 'Compte de destination',
  transferDescription: 'Déplacez de l’argent entre deux comptes différents',
  transactionDate: 'Date de la transaction',
  noteOptional: 'Note (facultatif)',
  noteA11y: 'Note de la transaction, facultatif',
  notePlaceholder: 'Ajoutez une description…',
  transactionType: 'Type de transaction',
  amount: 'Montant',
  amountIn: (currencyName: string) => `Montant en ${currencyName}`,
  upToTwoDecimals: 'Jusqu’à 2 décimales',
  wholeUnitsOnly: 'Sans décimales',
  saving: 'Enregistrement…',
  save: {
    expense: 'Enregistrer la dépense',
    income: 'Enregistrer le revenu',
    transfer: 'Enregistrer le virement',
  },
  saved: {
    expense: 'Dépense enregistrée',
    income: 'Revenu enregistré',
    transfer: 'Virement enregistré',
  },
  accountPicker: {
    close: 'Fermer le sélecteur de comptes',
    empty: 'Aucun compte actif pour l’instant. Ajoutez d’abord un compte, puis choisissez-le ici.',
    accountA11y: (name: string, type: string, balance: string) => `${name}, ${type}, solde ${balance}`,
  },
  categoryGrid: {
    title: 'Catégorie',
    viewAll: 'Tout voir',
    viewAllA11y: 'Voir toutes les catégories',
    hasSubcategories: (count: number) => `${count} ${plural(count, 'sous-catégorie', 'sous-catégories')}`,
    categoryA11y: (name: string) => `Catégorie ${name}`,
    noActive: 'Aucune catégorie active.',
    detail: (name: string) => `Détail de ${name}`,
    none: 'Aucune',
    noneA11y: (category: string) => `Aucune sous-catégorie, ${category} uniquement`,
    subcategoryA11y: (subcategory: string, category: string) => `${subcategory}, sous-catégorie de ${category}`,
  },
  categoryPicker: {
    close: 'Fermer le sélecteur de catégories',
    searchLabel: 'Rechercher des catégories',
    searchPlaceholder: 'Rechercher des catégories…',
    noMatches: (query: string) => `Aucune catégorie ne correspond à « ${query} ».`,
    noActive: 'Aucune catégorie active pour l’instant.',
    subcategoryA11y: (subcategory: string, category: string) => `${subcategory}, sous-catégorie de ${category}`,
  },
};
