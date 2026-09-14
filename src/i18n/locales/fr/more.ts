import type { more as en } from '../en/more';

export const more: typeof en = {
  title: 'Plus',
  closeLabel: 'Fermer Plus',
  items: {
    security: {
      label: 'Sécurité',
      description: 'Code PIN, biométrie et verrouillage automatique',
      accessibilityLabel: 'Ouvrir les réglages de sécurité',
      accessibilityHint: "Configurer le code PIN, la biométrie de l'appareil et le verrouillage automatique",
    },
    notifications: {
      label: 'Notifications',
      description: 'Rappels locaux et confidentialité des notifications',
      accessibilityLabel: 'Ouvrir les réglages de notifications',
      accessibilityHint: 'Configurer les rappels locaux : récurrences, budgets et rappel quotidien',
    },
    backup: {
      label: 'Sauvegarde',
      description: 'Sauvegarder ou restaurer une copie locale complète',
      accessibilityLabel: 'Ouvrir sauvegarde et restauration',
      accessibilityHint: 'Créer une sauvegarde locale ou remplacer les données locales depuis un fichier',
    },
    dataExport: {
      label: 'Export de données',
      description: "Fichiers CSV lisibles pour l'analyse et le partage",
      accessibilityLabel: "Ouvrir l'export de données",
      accessibilityHint: 'Créer des fichiers CSV lisibles pour tableurs, analyses et partage',
    },
    investments: {
      label: 'Placements',
      description: 'Suivre soldes, valorisations et rendement estimé',
      accessibilityLabel: 'Ouvrir les placements',
      accessibilityHint: 'Consulter les comptes de placement, valorisations et gains ou pertes estimés',
    },
    reports: {
      label: 'Rapports',
      description: 'Explorer flux de trésorerie, catégories et patrimoine net',
      accessibilityLabel: 'Ouvrir les rapports',
      accessibilityHint: 'Consulter revenus, dépenses, catégories, patrimoine net et comparaisons de périodes',
    },
    currency: {
      label: 'Devise et taux',
      description: 'Devise principale et taux de change',
      accessibilityLabel: 'Ouvrir devise et taux',
      accessibilityHint: 'Consulter la devise principale et les taux de change',
    },
    categories: {
      label: 'Catégories',
      description: 'Gérer les catégories de dépenses et de revenus',
      accessibilityLabel: 'Gérer les catégories',
      accessibilityHint: 'Créer, modifier, archiver et restaurer des catégories',
    },
    recurring: {
      label: 'Transactions récurrentes',
      description: 'Vérifier, confirmer, suspendre et planifier',
      accessibilityLabel: 'Gérer les transactions récurrentes',
      accessibilityHint: 'Consulter les échéances à traiter et gérer les règles récurrentes',
    },
    language: {
      label: 'Langue',
      accessibilityLabel: 'Changer de langue',
      accessibilityHint: "Choisir la langue de l'app",
    },
  },
  language: {
    title: 'Langue',
    intro: "Choisissez la langue de l'app. Les catégories par défaut que vous n'avez pas renommées sont aussi traduites.",
    deviceOption: "Comme l'appareil",
    deviceDetail: (languageName) => `Actuellement : ${languageName}`,
    selectedHint: 'Sélectionnée',
    changeFailed: "La langue n'a pas pu être changée. Veuillez réessayer.",
  },
};
