import type { onboarding as en } from '../en/onboarding';

export const onboarding: typeof en = {
  tagline: 'Votre argent, clair et confidentiel.',
  highlights: {
    privateTitle: 'Confidentielle par conception',
    privateBody: "Sans inscription. Vos données restent sur ce téléphone, sauf si vous les exportez.",
    currencyTitle: 'Toutes les devises',
    currencyBody: 'Gérez des comptes dans vos devises et voyez chaque total dans la vôtre.',
    budgetsTitle: 'Des budgets pour garder le cap',
    budgetsBody: 'Fixez un plafond mensuel et des limites par catégorie, et voyez où va votre argent.',
  },
  getStarted: 'Commencer',
  restore: 'Restaurer une sauvegarde',
  languageButton: (languageName) => `Langue : ${languageName}`,
  languageSheetTitle: 'Langue',
  currencyTitle: 'Devise principale',
  backToWelcome: "Retour à l'accueil",
  currencyQuestion: 'Quelle devise utilisez-vous au quotidien ?',
  currencyBody: 'Les totaux, budgets et rapports sont affichés dans cette devise. Vous pouvez aussi avoir des comptes dans d’autres devises.',
  currencyCardLabel: (code, name) => `Devise principale : ${code}, ${name}`,
  currencyCardHint: 'Ouvre la liste des devises',
  change: 'Modifier',
  lockNote: 'Vous pouvez la modifier jusqu’à votre première transaction ou votre premier budget. Ensuite, elle est fixe, car tous les montants y sont enregistrés.',
  saveFailed: "Votre devise n'a pas pu être enregistrée. Veuillez réessayer.",
  start: (code) => `Utiliser ${code} et commencer`,
  suggested: 'Suggérées',
  baseCurrency: {
    unsupported: 'Sélectionnez une devise prise en charge.',
    missing: "Les réglages de l'app sont absents de la base de données.",
    lockedByHistory: (count) =>
      count <= 1
        ? `Votre transaction enregistre sa valeur dans la devise principale actuelle. La changer obligerait à la recalculer avec des taux de change historiques, qui ne sont pas conservés.`
        : `Vos ${count} transactions enregistrent leur valeur dans la devise principale actuelle. La changer obligerait à les recalculer avec des taux de change historiques, qui ne sont pas conservés.`,
    lockedByBudgets: (count) =>
      count <= 1
        ? 'Votre budget est défini dans la devise principale actuelle. Supprimez-le pour choisir une autre devise principale.'
        : `Vos ${count} budgets sont définis dans la devise principale actuelle. Supprimez-les pour choisir une autre devise principale.`,
  },
};
