import type { dataExport as en } from '../en/data-export';
import { createPlural } from '../../plural';

const plural = createPlural('fr');

export const dataExport: typeof en = {
  title: 'Export de données',
  sizeBytes: (bytes: number) => `environ ${bytes} o`,
  sizeKib: (kib: number) => `environ ${kib} Kio`,
  sizeMib: (mib: string) => `environ ${mib} Mio`,
  confirmMessage: (detail: string) =>
    `Les fichiers CSV peuvent contenir des informations financières sensibles. Toute personne ayant accès au fichier peut le lire. Le verrouillage de l’app ne protège plus le fichier une fois sorti de Money Control.${detail ? `\n\n${detail}` : ''}`,
  confirmLabel: 'Continuer',
  warningTitle: 'Informations financières non chiffrées',
  warningBody: 'Les fichiers CSV sont lisibles par toute personne qui y a accès. Ils sont destinés aux tableurs, à l’analyse et au partage, pas à la restauration complète de l’app.',
  notBackupTitle: 'Un CSV n’est pas une sauvegarde',
  notBackupBody: 'Besoin de restaurer Money Control plus tard ? La sauvegarde conserve les identifiants et les relations dans un JSON versionné. Un CSV ne peut pas être restauré.',
  openBackupHint: 'Ouvre la fonction de sauvegarde pour une restauration complète',
  openBackupLabel: 'Ouvrir sauvegarde et restauration',
  openBackupButton: 'Ouvrir la sauvegarde',
  recordCount: (count: number) => `${count} ${plural(count, 'enregistrement', 'enregistrements')}`,
  emptyCard: 'Rien à exporter pour l’instant : ce CSV n’aurait aucune ligne.',
  notRestorable: 'CSV lisible · Pas une sauvegarde restaurable',
  notesPrivacy: 'Désactivé par défaut pour protéger la confidentialité du fichier.',
  footerNote: 'Les fichiers sont générés sur l’appareil, partagés un par un et supprimés du cache temporaire de Money Control à la fermeture de l’interface native. Money Control n’envoie aucune donnée.',

  transactionsTitle: 'Transactions',
  transactionsDescription: 'Lignes de transactions lisibles avec comptes source et destination, catégorie, statut, dates et notes facultatives.',
  filterDate: (range: string) => `Date : ${range}`,
  filterType: (value: string) => `Type : ${value}`,
  filterStatus: (value: string) => `Statut : ${value}`,
  filterAccount: (value: string) => `Compte : ${value}`,
  filterCategory: (value: string) => `Catégorie : ${value}`,
  allTypes: 'Tous',
  allStatuses: 'Tous',
  allAccounts: 'Tous',
  allCategories: 'Toutes',
  typeValues: {
    expense: 'dépense',
    income: 'revenu',
    transfer: 'virement',
    refund: 'remboursement',
  },
  statusValues: {
    posted: 'enregistrée',
    voided: 'annulée',
  },
  activeFilters: (count: number, size: string) =>
    `${count} ${plural(count, 'filtre actif', 'filtres actifs')} · ${size}`,
  configureFiltersLabel: 'Configurer les filtres d’export des transactions',
  configureFilters: 'Configurer les filtres',
  includeTransactionNotes: 'Inclure les notes des transactions',
  noTransactionsMatch: 'Aucune transaction ne correspond aux filtres sélectionnés.',
  largeExport: 'Export volumineux : la génération peut prendre plus de temps et utiliser plus de mémoire.',
  transactionLimitExceeded: 'Affinez les filtres. La limite de sécurité de 50 000 lignes est dépassée et aucun fichier partiel ne sera créé.',
  exportTransactionsButton: 'Exporter les transactions',
  exportTransactionsTitle: 'Exporter les transactions ?',
  transactionNotesIncluded: 'Les notes des transactions sont activées et seront incluses.',
  transactionNotesExcluded: 'Les notes des transactions sont exclues.',

  accountsTitle: 'Comptes',
  accountsDescription: 'Comptes actifs et archivés avec solde initial et solde actuel calculé. Les champs de dette des cartes utilisent le modèle de solde signé existant.',
  accountsCaption: 'Inclut tous les types de comptes. Les colonnes propres aux cartes de crédit restent vides pour les autres comptes.',
  exportAccountsButton: 'Exporter les comptes',
  exportAccountsTitle: 'Exporter les comptes ?',

  budgetsTitle: 'Budgets',
  budgetsDescription: 'Limites mensuelles avec les mêmes dépenses calculées, montant restant, pourcentage et statut que dans Budgets.',
  previousBudgetMonth: 'Mois de budget précédent',
  nextBudgetMonth: 'Mois de budget suivant',
  selectedBudgetMonth: (month: string) => `Mois de budget sélectionné : ${month}`,
  exportBudgetsButton: 'Exporter les budgets',
  exportBudgetsTitle: 'Exporter les budgets ?',

  recurringTitle: 'Transactions récurrentes',
  recurringDescription: 'Modèles récurrents uniquement : planification, cycle de vie, comptes, catégorie, montant et note facultative. L’export ne génère jamais d’occurrences ni de transactions.',
  includeRecurringNotes: 'Inclure les notes récurrentes',
  exportRecurringButton: 'Exporter les règles récurrentes',
  exportRecurringTitle: 'Exporter les règles récurrentes ?',
  recurringNotesIncluded: 'Les notes récurrentes sont activées et seront incluses.',
  recurringNotesExcluded: 'Les notes récurrentes sont exclues.',

  statementsTitle: 'Relevés de carte de crédit',
  statementsDescription: 'Relevés passés avec le solde et le minimum indiqués par la banque, les paiements imputés, les montants restants et le statut.',
  statementsCaption: 'Aucun numéro de carte, CVV, date d’expiration, échéancier déduit ni identifiant n’est enregistré ou exporté.',
  exportStatementsButton: 'Exporter les relevés',
  exportStatementsTitle: 'Exporter les relevés de carte ?',

  reportTitle: 'Résumé du rapport',
  reportDescription: 'Une ligne par indicateur de synthèse, avec les mêmes périodes et règles financières que les Rapports.',
  exportReportButton: 'Exporter le résumé',
  exportReportTitle: 'Exporter le résumé du rapport ?',

  investmentsTitle: 'Placements',
  investmentsDescription: 'Comptes de placement avec valeur actuelle, versements nets, gain ou perte estimé, rendement simple et valeur estimée dans votre devise principale (vide sans taux de change). Les placements archivés sont inclus.',
  investmentsCaption: 'Les valeurs sont estimées à partir de la dernière valorisation manuelle ; un gain ou une perte latent n’est jamais compté comme revenu.',
  exportInvestmentsButton: 'Exporter les placements',
  exportInvestmentsTitle: 'Exporter les placements ?',

  valuationsTitle: 'Valorisations des placements',
  valuationsDescription: 'Historique complet des valorisations manuelles de chaque compte de placement : date, devise, valeur et note facultative.',
  valuationsCaption: 'Une ligne par valorisation enregistrée, pour tous les comptes de placement.',
  exportValuationsButton: 'Exporter les valorisations',
  exportValuationsTitle: 'Exporter les valorisations ?',

  unconfirmedCopy: (message: string) => `${message} Money Control ne peut pas confirmer qu’une copie a été enregistrée.`,
  exportFailed: 'L’export CSV n’a pas pu aboutir. Vos données financières n’ont pas été modifiées. Réessayez.',
  overviewFailed: 'Impossible de charger les décomptes d’export. Essayez de rouvrir cet écran.',
  exportSucceeded: (fileName: string, rowCount: number, formattedRowCount: string) =>
    `${fileName} a été généré avec ${formattedRowCount} ${plural(rowCount, 'ligne', 'lignes')}. L’interface native d’enregistrement/partage s’est fermée ; Money Control ne peut pas savoir si vous avez enregistré, partagé ou annulé.`,

  noData: {
    transactions: 'Aucune transaction ne correspond aux options sélectionnées.',
    accounts: 'Aucun compte ne correspond aux options sélectionnées.',
    budgets: 'Aucun budget ne correspond aux options sélectionnées.',
    recurringRules: 'Aucune règle récurrente ne correspond aux options sélectionnées.',
    creditCardStatements: 'Aucun relevé de carte ne correspond aux options sélectionnées.',
    investments: 'Aucun placement ne correspond aux options sélectionnées.',
    investmentValuations: 'Aucune valorisation ne correspond aux options sélectionnées.',
  },
  rowLimitExceeded: (count: string, maximum: string) =>
    `Cet export contient ${count} lignes, au-delà de la limite de sécurité de ${maximum} lignes. Affinez la période ou les filtres et réessayez.`,

  writeFailed: 'Impossible de générer le fichier CSV. Vérifiez l’espace de stockage de l’appareil et réessayez.',
  sharingUnavailable: 'Le fichier CSV a été généré, mais l’interface native d’enregistrement/partage d’Android n’est pas disponible.',
  sharingOpenFailed: 'Le fichier CSV a été généré, mais l’interface native d’enregistrement/partage d’Android n’a pas pu s’ouvrir.',
  shareFailed: 'Le fichier CSV a été généré, mais il n’a pas pu être partagé.',
  shareDialogTitle: 'Enregistrer ou partager le CSV Money Control',
};
